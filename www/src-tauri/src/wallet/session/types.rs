use std::time::Instant;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::super::{
    card::{CardDraft, CardPreview},
    vault::{AuditEvent, Vault},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub initialized: bool,
    pub secure_store_available: bool,
    pub protected: bool,
    pub locked: bool,
    pub system_auth_available: bool,
    pub unlock_minutes: u64,
    pub unlock_until: Option<u64>,
    pub sensitive_until: Option<u64>,
    pub generation: u64,
    pub format_version: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InitializeMode {
    Device,
    Password,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SaveRequest {
    pub operation_id: Uuid,
    pub draft: CardDraft,
    pub expected_revision: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    pub id: Uuid,
    pub revision: i64,
}

#[derive(Deserialize, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ListRequest {
    pub cursor: Option<String>,
    pub limit: Option<usize>,
    pub sort: String,
    pub search: String,
    pub kind: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardPage {
    pub cards: Vec<CardPreview>,
    pub next_cursor: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Cursor {
    pub(super) generation: u64,
    pub(super) revision: i64,
    pub(super) offset: usize,
    pub(super) query: ListRequest,
}

pub(super) struct Session {
    pub(super) vault: Option<Vault>,
    pub(super) epoch: u64,
    pub(super) last_activity: Instant,
    pub(super) failures: u32,
    pub(super) backoff_until: Option<Instant>,
    pub(super) secure_store_available: Option<bool>,
    pub(super) pending_audits: Vec<AuditEvent>,
    pub(super) authorized_at: Option<Instant>,
    pub(super) sensitive_at: Option<Instant>,
}
