use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::error::Result;
use super::files::write_atomic;

/// `models/installed.json`: the one current version of each installed pack,
/// and folders a failed delete left behind. Only finished, verified versions
/// are recorded here; download states live in memory.
#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Installed {
    #[serde(default)]
    pub packs: BTreeMap<String, InstalledPack>,
    #[serde(default)]
    pub pending_delete: Vec<String>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPack {
    pub version: String,
    pub bytes: u64,
    pub installed_at: u64,
}

fn path(dir: &Path) -> PathBuf {
    dir.join("installed.json")
}

impl Installed {
    pub fn load(dir: &Path) -> Self {
        std::fs::read(path(dir))
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, dir: &Path) -> Result<()> {
        std::fs::create_dir_all(dir)?;
        write_atomic(&path(dir), &serde_json::to_vec_pretty(self)?)?;
        Ok(())
    }
}
