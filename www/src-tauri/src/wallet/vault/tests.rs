use super::*;

fn vault() -> Vault {
    Vault::initialize(
        Connection::open_in_memory().unwrap(),
        crypto::random_key().unwrap(),
        KeyPolicy::Device {
            key_reference: "synthetic-test-key".into(),
        },
    )
    .unwrap()
}

#[test]
fn encrypted_mutations_retry_and_detect_stale_edits() {
    let mut vault = vault();
    let id = Uuid::new_v4();
    let operation_id = Uuid::new_v4();
    let request = || Mutation {
        id,
        operation_id,
        category: Category::Card,
        expected_revision: None,
        payload: Some(b"synthetic holder 00123456"),
    };
    let first = vault.mutate(request()).unwrap();
    assert_eq!(first, vault.mutate(request()).unwrap());
    assert_eq!(
        vault.read(id, Category::Card).unwrap().1.as_slice(),
        b"synthetic holder 00123456"
    );
    let (_, encrypted) = vault.encrypted_record(&id.to_string(), "card").unwrap();
    assert!(!encrypted.ciphertext.windows(8).any(|w| w == b"00123456"));
    assert_eq!(
        vault.mutate(Mutation {
            payload: Some(b"changed"),
            ..request()
        }),
        Err(WalletError::InvalidOperation)
    );
    assert_eq!(
        vault.mutate(Mutation {
            operation_id: Uuid::new_v4(),
            ..request()
        }),
        Err(WalletError::Conflict)
    );
    assert_eq!(vault.revision(), 1);
    vault.authenticate_header().unwrap();
}

#[test]
fn altered_header_fails_closed() {
    let vault = vault();
    vault
        .connection
        .execute("UPDATE wallet_header SET revision = 5", [])
        .unwrap();
    let header = Vault::read_header(&vault.connection).unwrap();
    let altered = Vault { header, ..vault };
    assert_eq!(
        altered.authenticate_header(),
        Err(WalletError::CorruptVault)
    );
}

#[test]
fn failed_write_preserves_last_committed_state() {
    let mut vault = vault();
    vault
        .connection
        .execute_batch(
            "CREATE TRIGGER reject_receipt BEFORE INSERT ON wallet_operations
        BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END;",
        )
        .unwrap();
    let id = Uuid::new_v4();
    assert_eq!(
        vault.mutate(Mutation {
            id,
            operation_id: Uuid::new_v4(),
            category: Category::Card,
            expected_revision: None,
            payload: Some(b"synthetic")
        }),
        Err(WalletError::WriteFailure)
    );
    assert_eq!(vault.revision(), 0);
    assert!(matches!(
        vault.read(id, Category::Card),
        Err(WalletError::Missing)
    ));
    vault.authenticate_header().unwrap();
}

#[test]
fn restart_and_disk_files_preserve_encryption() {
    let directory = std::env::temp_dir().join(format!("notables-wallet-test-{}", Uuid::new_v4()));
    std::fs::create_dir(&directory).unwrap();
    let path = directory.join("vault.sqlite");
    let key = crypto::random_key().unwrap();
    let mut vault = Vault::create(
        &path,
        key.clone(),
        KeyPolicy::Device {
            key_reference: "synthetic-test-key".into(),
        },
    )
    .unwrap();
    let id = Uuid::new_v4();
    let secret = b"synthetic-holder-and-identifier-0000123456789";
    let mut stale_writer = Vault::open(&path, key.clone()).unwrap();
    vault
        .mutate(Mutation {
            id,
            operation_id: Uuid::new_v4(),
            category: Category::Card,
            expected_revision: None,
            payload: Some(secret),
        })
        .unwrap();
    assert_eq!(
        stale_writer.mutate(Mutation {
            id: Uuid::new_v4(),
            operation_id: Uuid::new_v4(),
            category: Category::Card,
            expected_revision: None,
            payload: Some(b"stale writer")
        }),
        Err(WalletError::Conflict)
    );
    drop(stale_writer);
    for file in std::fs::read_dir(&directory).unwrap() {
        let bytes = std::fs::read(file.unwrap().path()).unwrap();
        assert!(!bytes.windows(secret.len()).any(|window| window == secret));
    }
    drop(vault);
    let mut vault = Vault::open(&path, key.clone()).unwrap();
    assert_eq!(vault.read(id, Category::Card).unwrap().1.as_slice(), secret);
    vault
        .mutate(Mutation {
            id,
            operation_id: Uuid::new_v4(),
            category: Category::Card,
            expected_revision: Some(1),
            payload: None,
        })
        .unwrap();
    assert!(matches!(
        vault.read(id, Category::Card),
        Err(WalletError::Missing)
    ));
    drop(vault);
    assert!(matches!(
        Vault::open(&path, crypto::random_key().unwrap()),
        Err(WalletError::CorruptVault)
    ));
    assert!(matches!(
        Vault::create(
            &path,
            key.clone(),
            KeyPolicy::Device {
                key_reference: "synthetic-test-key".into()
            }
        ),
        Err(WalletError::WriteFailure)
    ));
    let connection = Connection::open(&path).unwrap();
    connection.pragma_update(None, "user_version", 99).unwrap();
    drop(connection);
    assert!(matches!(
        Vault::open(&path, key),
        Err(WalletError::UnsupportedFormat)
    ));
    let version: u32 = Connection::open(&path)
        .unwrap()
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .unwrap();
    assert_eq!(version, 99);
    std::fs::remove_dir_all(directory).unwrap();
}
