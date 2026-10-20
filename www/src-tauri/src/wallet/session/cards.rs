use std::time::{Duration, Instant};

use uuid::Uuid;
use zeroize::Zeroizing;

use super::super::{
    card::Card,
    error::{Result, WalletError},
    vault::{AuditEvent, Category, Mutation, Receipt},
};
use super::{CardPage, ListRequest, SaveRequest, SaveResult, Wallet, now, types::Cursor};

impl Wallet {
    pub fn read(&self, id: Uuid) -> Result<Card> {
        let mut state = self.session()?;
        self.check(state.epoch)?;
        let (revision, bytes) = state
            .vault
            .as_ref()
            .ok_or(WalletError::Locked)?
            .read(id, Category::Card)?;
        let card = Card::decode(&bytes, id, revision)?;
        self.check(state.epoch)?;
        state.last_activity = Instant::now();
        Ok(card)
    }

    pub fn save(&self, mut request: SaveRequest) -> Result<SaveResult> {
        let mut state = self.session()?;
        let epoch = state.epoch;
        self.check(epoch)?;
        let may_edit_secrets = !self.authentication_required
            || (!self.access_expired(&state)
                && state
                    .sensitive_at
                    .is_some_and(|at| at.elapsed() < Duration::from_secs(300)));
        let vault = state.vault.as_mut().ok_or(WalletError::Locked)?;
        let previous = match vault.read(request.draft.id, Category::Card) {
            Ok((revision, bytes)) => Some(Card::decode(&bytes, request.draft.id, revision)?),
            Err(WalletError::Missing) => None,
            Err(error) => return Err(error),
        };
        for field in &mut request.draft.fields {
            if field.redacted {
                if !field.value.is_empty() {
                    return Err(WalletError::InvalidInput);
                }
                let existing = previous
                    .as_ref()
                    .and_then(|card| {
                        card.draft
                            .fields
                            .iter()
                            .find(|saved| saved.id == field.id && saved.key == field.key)
                    })
                    .filter(|saved| saved.is_sensitive())
                    .ok_or(WalletError::InvalidInput)?;
                field.value.clone_from(&existing.value);
                field.sensitive = existing.sensitive;
                field.redacted = false;
            }
        }
        if !may_edit_secrets && let Some(card) = &previous {
            for saved in card
                .draft
                .fields
                .iter()
                .filter(|field| field.is_sensitive())
            {
                let next = request
                    .draft
                    .fields
                    .iter()
                    .find(|field| field.id == saved.id);
                if next.is_none_or(|field| {
                    field.key != saved.key || field.value != saved.value || !field.is_sensitive()
                }) {
                    return Err(WalletError::Locked);
                }
            }
        }
        request.draft.validate()?;
        let time = now()?;
        let created_at = previous.as_ref().map_or(time, |card| card.created_at);
        let updated_at = previous
            .as_ref()
            .map_or(time, |card| time.max(card.updated_at));
        let fingerprint = Zeroizing::new(
            serde_json::to_vec(&(
                "save",
                request.operation_id,
                &request.draft,
                request.expected_revision,
            ))
            .map_err(|_| WalletError::InvalidInput)?,
        );
        let card = Card {
            format_version: 1,
            revision: request
                .expected_revision
                .unwrap_or(0)
                .checked_add(1)
                .ok_or(WalletError::Quota)?,
            created_at,
            updated_at,
            draft: request.draft,
        };
        let payload =
            Zeroizing::new(serde_json::to_vec(&card).map_err(|_| WalletError::InvalidInput)?);
        let event = AuditEvent {
            action: "save".into(),
            time,
            outcome: "success".into(),
            operation_id: request.operation_id,
        };
        let receipt = vault.mutate_checked(
            Mutation {
                operation_id: request.operation_id,
                id: card.draft.id,
                category: Category::Card,
                expected_revision: request.expected_revision,
                payload: Some(&payload),
            },
            Some(&fingerprint),
            Some(&event),
            || self.check(epoch),
        )?;
        state.last_activity = Instant::now();
        Ok(SaveResult {
            id: card.draft.id,
            revision: receipt.record_revision,
        })
    }

    pub fn delete(&self, id: Uuid, operation: Uuid, revision: i64) -> Result<Receipt> {
        let mut state = self.session()?;
        let epoch = state.epoch;
        self.check(epoch)?;
        let event = AuditEvent {
            action: "delete".into(),
            time: now()?,
            outcome: "success".into(),
            operation_id: operation,
        };
        let result = state
            .vault
            .as_mut()
            .ok_or(WalletError::Locked)?
            .mutate_checked(
                Mutation {
                    id,
                    operation_id: operation,
                    category: Category::Card,
                    expected_revision: Some(revision),
                    payload: None,
                },
                None,
                Some(&event),
                || self.check(epoch),
            )?;
        state.last_activity = Instant::now();
        Ok(result)
    }

    pub fn list(&self, mut request: ListRequest) -> Result<CardPage> {
        use base64::Engine;
        let mut state = self.session()?;
        let epoch = state.epoch;
        self.check(epoch)?;
        let vault = state.vault.as_ref().ok_or(WalletError::Locked)?;
        let limit = request.limit.unwrap_or(25);
        if !(1..=50).contains(&limit)
            || request.search.chars().count() > 200
            || !["updated", "name"].contains(&request.sort.as_str())
            || request.kind.as_ref().is_some_and(|k| {
                ![
                    "bank",
                    "national-id",
                    "passport",
                    "electricity",
                    "television",
                    "sim",
                    "membership",
                    "other",
                ]
                .contains(&k.as_str())
            })
        {
            return Err(WalletError::InvalidInput);
        }
        let encoded = request.cursor.take();
        let offset = if let Some(encoded) = encoded {
            if encoded.len() > 4096 {
                return Err(WalletError::InvalidCursor);
            }
            let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
                .decode(encoded)
                .map_err(|_| WalletError::InvalidCursor)?;
            let cursor: Cursor =
                serde_json::from_slice(&bytes).map_err(|_| WalletError::InvalidCursor)?;
            if cursor.generation != epoch
                || cursor.revision != vault.revision()
                || cursor.query != request
                || cursor.offset > 1000
            {
                return Err(WalletError::InvalidCursor);
            }
            cursor.offset
        } else {
            0
        };
        let search = request.search.to_lowercase();
        let mut cards = Vec::new();
        for (id, revision, payload) in vault.records(Category::Card)? {
            let card = Card::decode(&payload, id, revision)?;
            if (request
                .kind
                .as_ref()
                .is_none_or(|kind| kind == &card.draft.kind))
                && (card.draft.display_name.to_lowercase().contains(&search)
                    || card
                        .draft
                        .issuer
                        .as_ref()
                        .is_some_and(|s| s.to_lowercase().contains(&search)))
            {
                cards.push(card.preview());
            }
        }
        if request.sort == "name" {
            cards.sort_by(|a, b| a.display_name.cmp(&b.display_name).then(a.id.cmp(&b.id)));
        } else {
            cards.sort_by(|a, b| b.updated_at.cmp(&a.updated_at).then(a.id.cmp(&b.id)));
        }
        let next = offset + limit;
        let next_cursor = if next < cards.len() {
            Some(
                base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(
                    serde_json::to_vec(&Cursor {
                        generation: epoch,
                        revision: vault.revision(),
                        offset: next,
                        query: request,
                    })
                    .map_err(|_| WalletError::InvalidInput)?,
                ),
            )
        } else {
            None
        };
        let cards = cards.into_iter().skip(offset).take(limit).collect();
        self.check(epoch)?;
        state.last_activity = Instant::now();
        Ok(CardPage { cards, next_cursor })
    }
}
