use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::error::{Result, WalletError};

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Side {
    Front,
    Back,
}

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SideAvailability {
    Available,
    Missing,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SideState {
    pub front: SideAvailability,
    pub back: SideAvailability,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Field {
    pub id: Uuid,
    pub card_id: Uuid,
    pub key: String,
    pub label: String,
    pub value: String,
    pub order: u32,
    pub side: Side,
    pub source: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Appearance {
    pub form_factor: String,
    pub palette: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CardDraft {
    pub id: Uuid,
    pub kind: String,
    pub display_name: String,
    pub issuer: Option<String>,
    pub template_id: String,
    pub template_version: u32,
    pub side_state: SideState,
    pub fields: Vec<Field>,
    pub appearance: Appearance,
    pub retain_security_code: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Card {
    pub format_version: u32,
    pub draft: CardDraft,
    pub revision: i64,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardPreview {
    pub id: Uuid,
    pub revision: i64,
    pub kind: String,
    pub display_name: String,
    pub issuer: Option<String>,
    pub appearance: Appearance,
    pub last_four: Option<String>,
    pub updated_at: u64,
}

impl CardDraft {
    pub fn validate(&mut self) -> Result<()> {
        let allowed: &[&str] = match self.kind.as_str() {
            "bank" => &["holder", "number", "expiry", "cvv", "issuer"],
            "national-id" | "passport" => &["holder", "number", "expiry", "issuer"],
            "electricity" => &["meter", "account", "holder", "issuer"],
            "television" => &["account", "number", "holder", "issuer"],
            "sim" => &["account", "number", "puk", "holder", "issuer"],
            "membership" => &["holder", "number", "expiry", "issuer"],
            "other" => &["holder", "number", "account", "issuer"],
            _ => return Err(WalletError::InvalidInput),
        };
        if self.display_name.trim().is_empty()
            || self.display_name.chars().count() > 200
            || self.fields.len() > 100
            || self
                .issuer
                .as_ref()
                .is_some_and(|s| s.chars().count() > 200)
            || self.template_id != format!("{}-landscape", self.kind)
            || self.template_version != 1
            || self.appearance.form_factor != "landscape"
            || ![
                "blush", "honey", "sage", "ocean", "lavender", "rose", "graphite",
            ]
            .contains(&self.appearance.palette.as_str())
        {
            return Err(WalletError::InvalidInput);
        }
        let mut ids = HashSet::new();
        let mut keys = HashSet::new();
        for field in &self.fields {
            let custom = field
                .key
                .strip_prefix("custom:")
                .and_then(|key| Uuid::parse_str(key).ok())
                .is_some();
            if field.card_id != self.id
                || !ids.insert(field.id)
                || !keys.insert(&field.key)
                || field.label.trim().is_empty()
                || field.label.chars().count() > 80
                || field.value.chars().count() > 4096
                || !["manual", "recognition"].contains(&field.source.as_str())
                || field.order > 100
                || (!custom && !allowed.contains(&field.key.as_str()))
                || (field.side == Side::Front && self.side_state.front == SideAvailability::Missing)
                || (field.side == Side::Back && self.side_state.back == SideAvailability::Missing)
            {
                return Err(WalletError::InvalidInput);
            }
        }
        if !self.retain_security_code {
            self.fields.retain(|field| field.key != "cvv");
        }
        Ok(())
    }
}

impl Card {
    pub fn preview(&self) -> CardPreview {
        let last_four = self
            .draft
            .fields
            .iter()
            .find(|f| f.key == "number")
            .map(|f| {
                f.value
                    .chars()
                    .rev()
                    .take(4)
                    .collect::<Vec<_>>()
                    .into_iter()
                    .rev()
                    .collect()
            });
        CardPreview {
            id: self.draft.id,
            revision: self.revision,
            kind: self.draft.kind.clone(),
            display_name: self.draft.display_name.clone(),
            issuer: self.draft.issuer.clone(),
            appearance: self.draft.appearance.clone(),
            last_four,
            updated_at: self.updated_at,
        }
    }

    pub fn decode(bytes: &[u8], id: Uuid, revision: i64) -> Result<Self> {
        let mut card: Self =
            serde_json::from_slice(bytes).map_err(|_| WalletError::CorruptVault)?;
        if card.format_version != 1 {
            return Err(WalletError::UnsupportedFormat);
        }
        if card.draft.id != id || card.revision != revision || card.created_at > card.updated_at {
            return Err(WalletError::CorruptVault);
        }
        card.draft
            .validate()
            .map_err(|_| WalletError::CorruptVault)?;
        Ok(card)
    }
}
