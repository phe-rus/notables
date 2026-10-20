pub(super) const CONTENT_LIMIT: i64 = 32 * 1024 * 1024;
pub(super) const RECORD_LIMIT: usize = 4 * 1024 * 1024;
pub(super) const SCHEMA: &str = "
CREATE TABLE wallet_header (
 singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
 format_version INTEGER NOT NULL, wallet_id TEXT NOT NULL,
 revision INTEGER NOT NULL, protection_mode TEXT NOT NULL,
 wrappers_json TEXT NOT NULL, key_generation INTEGER NOT NULL,
 transition_phase TEXT NOT NULL
);
CREATE TABLE wallet_records (
 id TEXT PRIMARY KEY, category TEXT NOT NULL, revision INTEGER NOT NULL,
 nonce BLOB NOT NULL CHECK (length(nonce) = 24), ciphertext BLOB NOT NULL
);
CREATE TABLE wallet_operations (
 operation_id TEXT PRIMARY KEY, result_ciphertext BLOB NOT NULL
);
PRAGMA user_version = 1;
";
