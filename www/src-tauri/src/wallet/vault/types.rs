use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::super::crypto::PasswordWrapper;

#[derive(Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "kebab-case", deny_unknown_fields)]
pub enum KeyPolicy {
    Device { key_reference: String },
    Password { wrapper: PasswordWrapper },
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Header {
    pub format_version: u32,
    pub wallet_id: Uuid,
    pub revision: i64,
    pub key_generation: i64,
    pub policy: KeyPolicy,
}

#[derive(Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Category {
    Card,
    Template,
    Original,
}

impl Category {
    pub(super) fn name(self) -> &'static str {
        match self {
            Self::Card => "card",
            Self::Template => "template",
            Self::Original => "original",
        }
    }
}

#[derive(Serialize)]
pub struct Mutation<'a> {
    pub operation_id: Uuid,
    pub id: Uuid,
    pub category: Category,
    pub expected_revision: Option<i64>,
    /// A validated aggregate, serialized before entering the storage layer.
    /// None deletes an existing aggregate.
    pub payload: Option<&'a [u8]>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Receipt {
    pub record_revision: i64,
    pub vault_revision: i64,
    pub deleted: bool,
}

#[derive(Serialize, Deserialize)]
pub(super) struct StoredReceipt {
    pub(super) fingerprint: Vec<u8>,
    pub(super) result: Receipt,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuditEvent {
    pub action: String,
    pub time: u64,
    pub outcome: String,
    pub operation_id: Uuid,
}
