use std::{collections::HashMap, sync::Arc};

use super::*;
use crate::wallet::{
    card::{Appearance, Field, Side, SideAvailability, SideState},
    crypto::DataKey,
};

#[derive(Default)]
struct MemoryKeys(Mutex<HashMap<String, DataKey>>);
impl KeyStore for Arc<MemoryKeys> {
    fn read(&self, reference: &str) -> Result<DataKey> {
        self.0
            .lock()
            .unwrap()
            .get(reference)
            .cloned()
            .ok_or(WalletError::SecureStoreUnavailable)
    }
    fn write(&self, reference: &str, key: &DataKey) -> Result<()> {
        self.0.lock().unwrap().insert(reference.into(), key.clone());
        Ok(())
    }
    fn remove(&self, reference: &str) -> Result<()> {
        self.0.lock().unwrap().remove(reference);
        Ok(())
    }
}

struct UnavailableKeys;
impl KeyStore for UnavailableKeys {
    fn read(&self, _: &str) -> Result<DataKey> {
        Err(WalletError::SecureStoreUnavailable)
    }
    fn write(&self, _: &str, _: &DataKey) -> Result<()> {
        Err(WalletError::SecureStoreUnavailable)
    }
    fn remove(&self, _: &str) -> Result<()> {
        Err(WalletError::SecureStoreUnavailable)
    }
}

struct Directory(PathBuf);
impl Directory {
    fn new() -> Self {
        Self(std::env::temp_dir().join(format!("notables-session-test-{}", Uuid::new_v4())))
    }
}
impl Drop for Directory {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn draft() -> CardDraft {
    let id = Uuid::new_v4();
    CardDraft {
        id,
        kind: "bank".into(),
        display_name: "Synthetic card".into(),
        issuer: Some("Synthetic issuer".into()),
        template_id: "bank-landscape".into(),
        template_version: 1,
        side_state: SideState {
            front: SideAvailability::Available,
            back: SideAvailability::Available,
        },
        fields: vec![
            Field {
                id: Uuid::new_v4(),
                card_id: id,
                key: "number".into(),
                label: "Number".into(),
                value: "0012345678905678".into(),
                order: 0,
                side: Side::Front,
                source: "manual".into(),
            },
            Field {
                id: Uuid::new_v4(),
                card_id: id,
                key: "cvv".into(),
                label: "Security code".into(),
                value: "987".into(),
                order: 1,
                side: Side::Back,
                source: "manual".into(),
            },
        ],
        appearance: Appearance {
            form_factor: "landscape".into(),
            palette: "honey".into(),
        },
        retain_security_code: false,
    }
}

fn query() -> ListRequest {
    ListRequest {
        cursor: None,
        limit: Some(1),
        sort: "updated".into(),
        search: "".into(),
        kind: None,
    }
}

#[test]
fn unavailable_store_never_creates_a_plain_key_or_vault() {
    let directory = Directory::new();
    let wallet = Wallet::with_keys(&directory.0, Box::new(UnavailableKeys));
    assert!(!wallet.status().unwrap().secure_store_available);
    assert!(matches!(
        wallet.initialize(InitializeMode::Device, None, None),
        Err(WalletError::SecureStoreUnavailable)
    ));
    assert!(!directory.0.exists());
    assert!(matches!(
        wallet.read(Uuid::new_v4()),
        Err(WalletError::Locked)
    ));
}

#[test]
fn device_wallet_restarts_without_prompt_and_masks_previews() {
    let directory = Directory::new();
    let keys = Arc::new(MemoryKeys::default());
    let wallet = Wallet::with_keys(&directory.0, Box::new(keys.clone()));
    assert!(
        !wallet
            .initialize(InitializeMode::Device, None, None)
            .unwrap()
            .protected
    );
    let draft = draft();
    let operation = Uuid::new_v4();
    let save = || SaveRequest {
        operation_id: operation,
        draft: draft.clone(),
        expected_revision: None,
    };
    assert_eq!(wallet.save(save()).unwrap().revision, 1);
    std::thread::sleep(Duration::from_millis(2));
    assert_eq!(wallet.save(save()).unwrap().revision, 1);
    let full = wallet.read(draft.id).unwrap();
    assert_eq!(full.draft.fields[0].value, "0012345678905678");
    assert!(!full.draft.fields.iter().any(|field| field.key == "cvv"));
    let page = wallet.list(query()).unwrap();
    assert_eq!(page.cards[0].last_four.as_deref(), Some("5678"));
    let json = serde_json::to_string(&page).unwrap();
    assert!(!json.contains("0012345678905678"));
    assert!(!json.contains("987"));
    wallet.background();
    assert!(matches!(wallet.read(draft.id), Err(WalletError::Locked)));
    wallet.foreground();
    assert!(!wallet.status().unwrap().locked);
    drop(wallet);
    let restarted = Wallet::with_keys(&directory.0, Box::new(keys));
    assert!(!restarted.status().unwrap().locked);
    assert_eq!(restarted.read(draft.id).unwrap().revision, 1);
    assert_eq!(
        restarted.delete(draft.id, operation, 1).err(),
        Some(WalletError::InvalidOperation)
    );
    let delete_operation = Uuid::new_v4();
    assert!(
        restarted
            .delete(draft.id, delete_operation, 1)
            .unwrap()
            .deleted
    );
    assert!(
        restarted
            .delete(draft.id, delete_operation, 1)
            .unwrap()
            .deleted
    );
}

#[test]
fn pagination_rejects_cursor_after_mutation_and_different_queries() {
    let directory = Directory::new();
    let wallet = Wallet::with_keys(&directory.0, Box::new(Arc::new(MemoryKeys::default())));
    wallet
        .initialize(InitializeMode::Device, None, None)
        .unwrap();
    for _ in 0..2 {
        wallet
            .save(SaveRequest {
                operation_id: Uuid::new_v4(),
                draft: draft(),
                expected_revision: None,
            })
            .unwrap();
    }
    let page = wallet.list(query()).unwrap();
    assert_eq!(page.cards.len(), 1);
    let mut next = query();
    next.cursor = page.next_cursor;
    assert_eq!(wallet.list(next.clone()).unwrap().cards.len(), 1);
    let mut wrong_query = next.clone();
    wrong_query.search = "changed".into();
    assert!(matches!(
        wallet.list(wrong_query),
        Err(WalletError::InvalidCursor)
    ));
    wallet
        .save(SaveRequest {
            operation_id: Uuid::new_v4(),
            draft: draft(),
            expected_revision: None,
        })
        .unwrap();
    assert!(matches!(wallet.list(next), Err(WalletError::InvalidCursor)));
}

#[test]
fn password_wallet_requires_native_unlock_after_background_and_idle() {
    let directory = Directory::new();
    let wallet = Wallet::with_keys(&directory.0, Box::new(UnavailableKeys));
    let password = || Zeroizing::new("synthetic wallet password".into());
    assert!(
        wallet
            .initialize(InitializeMode::Password, Some(password()), Some(password()))
            .unwrap()
            .protected
    );
    let draft = draft();
    wallet
        .save(SaveRequest {
            operation_id: Uuid::new_v4(),
            draft: draft.clone(),
            expected_revision: None,
        })
        .unwrap();
    wallet.background();
    wallet.foreground();
    assert!(wallet.status().unwrap().locked);
    assert!(matches!(wallet.read(draft.id), Err(WalletError::Locked)));
    assert!(matches!(
        wallet.unlock(Zeroizing::new("incorrect password".into())),
        Err(WalletError::InvalidCredential)
    ));
    assert!(wallet.status().unwrap().locked);
    assert!(!wallet.unlock(password()).unwrap().locked);
    assert_eq!(wallet.read(draft.id).unwrap().revision, 1);
    {
        let mut state = wallet.state.lock().unwrap();
        state.last_activity = Instant::now() - IDLE_LIMIT;
    }
    wallet.expire_idle();
    assert!(matches!(wallet.activity(), Err(WalletError::Locked)));
    assert!(wallet.status().unwrap().locked);
    wallet.unlock(password()).unwrap();
    for _ in 0..5 {
        assert!(matches!(
            wallet.unlock(Zeroizing::new("wrong password".into())),
            Err(WalletError::InvalidCredential)
        ));
    }
    assert!(matches!(
        wallet.unlock(password()),
        Err(WalletError::Throttled)
    ));
}

#[test]
fn manual_fields_validate_owner_and_security_code_opt_in() {
    let mut card = draft();
    card.fields[0].card_id = Uuid::new_v4();
    assert_eq!(card.validate(), Err(WalletError::InvalidInput));
    let mut card = draft();
    card.retain_security_code = true;
    card.validate().unwrap();
    assert!(card.fields.iter().any(|f| f.key == "cvv"));
    card.fields.push(card.fields[0].clone());
    assert_eq!(card.validate(), Err(WalletError::InvalidInput));
}

#[test]
fn publishing_a_vault_never_replaces_an_existing_file() {
    let directory = Directory::new();
    std::fs::create_dir_all(&directory.0).unwrap();
    let staging = directory.0.join("new.staging");
    let destination = directory.0.join("vault.sqlite");
    std::fs::write(&staging, b"new vault").unwrap();
    std::fs::write(&destination, b"existing vault").unwrap();
    assert_eq!(
        publish_vault(&staging, &destination),
        Err(WalletError::WriteFailure)
    );
    assert_eq!(std::fs::read(&destination).unwrap(), b"existing vault");
    assert_eq!(std::fs::read(&staging).unwrap(), b"new vault");
    std::fs::remove_file(&destination).unwrap();
    publish_vault(&staging, &destination).unwrap();
    assert_eq!(std::fs::read(&destination).unwrap(), b"new vault");
    assert!(!staging.exists());
}

#[test]
fn prototype_migration_preserves_cards_and_reopens_without_credential() {
    let directory = Directory::new();
    let keys = Arc::new(MemoryKeys::default());
    let wallet = Wallet::with_keys(&directory.0, Box::new(keys.clone()));
    let password = || Zeroizing::new("synthetic migration credential".into());
    wallet
        .initialize(InitializeMode::Password, Some(password()), Some(password()))
        .unwrap();
    let draft = draft();
    let operation = Uuid::new_v4();
    let save = || SaveRequest {
        operation_id: operation,
        draft: draft.clone(),
        expected_revision: None,
    };
    let saved = wallet.save(save()).unwrap();
    wallet.lock().unwrap();
    assert!(matches!(
        wallet.migrate_prototype(Zeroizing::new("incorrect".into())),
        Err(WalletError::InvalidCredential)
    ));
    assert!(matches!(
        Vault::inspect(&wallet.path).unwrap().policy,
        KeyPolicy::Password { .. }
    ));
    let KeyPolicy::Password { wrapper } = Vault::inspect(&wallet.path).unwrap().policy else {
        panic!("expected prototype");
    };
    let obsolete = crypto::unwrap_password(&wrapper, &password(), PASSWORD_CONTEXT).unwrap();
    let status = wallet.migrate_prototype(password()).unwrap();
    assert!(matches!(
        Vault::open(&wallet.path, obsolete),
        Err(WalletError::CorruptVault)
    ));
    assert!(!status.protected && !status.locked);
    let header = Vault::inspect(&wallet.path).unwrap();
    assert_eq!(header.key_generation, 2);
    assert!(matches!(header.policy, KeyPolicy::Device { .. }));
    assert_eq!(wallet.save(save()).unwrap().revision, saved.revision);
    drop(wallet);
    let restarted = Wallet::with_keys(&directory.0, Box::new(keys));
    assert!(!restarted.status().unwrap().locked);
    let restored = restarted.read(draft.id).unwrap();
    assert_eq!(restored.revision, saved.revision);
    assert_eq!(restored.draft.fields[0].value, "0012345678905678");
}

#[test]
fn failed_prototype_migration_preserves_the_old_wrapper_and_cards() {
    let directory = Directory::new();
    let wallet = Wallet::with_keys(&directory.0, Box::new(UnavailableKeys));
    let password = || Zeroizing::new("synthetic migration credential".into());
    wallet
        .initialize(InitializeMode::Password, Some(password()), Some(password()))
        .unwrap();
    let draft = draft();
    wallet
        .save(SaveRequest {
            operation_id: Uuid::new_v4(),
            draft: draft.clone(),
            expected_revision: None,
        })
        .unwrap();
    assert!(matches!(
        wallet.migrate_prototype(password()),
        Err(WalletError::SecureStoreUnavailable)
    ));
    assert!(matches!(
        Vault::inspect(&wallet.path).unwrap().policy,
        KeyPolicy::Password { .. }
    ));
    assert!(wallet.status().unwrap().locked);
    wallet.unlock(password()).unwrap();
    assert_eq!(
        wallet.read(draft.id).unwrap().draft.fields[0].value,
        "0012345678905678"
    );
    // Failure after staging must remove only the new uncommitted device key.
    let keys = Arc::new(MemoryKeys::default());
    let mut state = wallet.session().unwrap();
    let vault = state.vault.as_mut().unwrap();
    assert!(matches!(
        vault.migrate_prototype_to_device(&keys, || Err(WalletError::Locked)),
        Err(WalletError::Locked)
    ));
    assert!(keys.0.lock().unwrap().is_empty());
    assert!(matches!(
        Vault::inspect(&wallet.path).unwrap().policy,
        KeyPolicy::Password { .. }
    ));
    assert_eq!(vault.read(draft.id, Category::Card).unwrap().0, 1);
}

#[test]
fn electricity_card_keeps_meter_zeros_across_restart_and_kind_filter() {
    let directory = Directory::new();
    let keys = Arc::new(MemoryKeys::default());
    let wallet = Wallet::with_keys(&directory.0, Box::new(keys.clone()));
    wallet
        .initialize(InitializeMode::Device, None, None)
        .unwrap();
    let mut utility = draft();
    utility.kind = "electricity".into();
    utility.template_id = "electricity-landscape".into();
    utility.display_name = "Synthetic Umeme".into();
    utility.fields.truncate(1);
    utility.fields[0].key = "meter".into();
    utility.fields[0].value = "00123456789".into();
    wallet
        .save(SaveRequest {
            operation_id: Uuid::new_v4(),
            draft: utility.clone(),
            expected_revision: None,
        })
        .unwrap();
    drop(wallet);
    let restarted = Wallet::with_keys(&directory.0, Box::new(keys));
    restarted.status().unwrap();
    assert_eq!(
        restarted.read(utility.id).unwrap().draft.fields[0].value,
        "00123456789"
    );
    let mut request = query();
    request.kind = Some("electricity".into());
    assert_eq!(
        restarted.list(request.clone()).unwrap().cards[0].kind,
        "electricity"
    );
    request.kind = Some("bank".into());
    assert!(restarted.list(request).unwrap().cards.is_empty());
}
