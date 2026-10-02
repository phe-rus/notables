use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use super::error::Result;
use super::files::write_atomic;

/// Where every model pack is served from (R2, behind the Worker).
pub const MODELS_BASE_URL: &str = "https://notables.pherus.org/models";

/// The manifest schema this app understands; any other keeps local state.
const SCHEMA: u32 = 1;
/// A fetched manifest is reused for a day.
const FRESH_FOR: Duration = Duration::from_secs(24 * 60 * 60);

/// The packs this app knows, their kind, and the file formats it can load.
pub const KNOWN_PACKS: &[KnownPack] = &[
    KnownPack {
        id: "supertonic-3",
        kind: "voice",
        formats: &[1],
    },
    KnownPack {
        id: "whisper-base",
        kind: "transcription",
        formats: &[1],
    },
];

pub struct KnownPack {
    pub id: &'static str,
    pub kind: &'static str,
    pub formats: &'static [u32],
}

pub fn known(id: &str) -> Option<&'static KnownPack> {
    KNOWN_PACKS.iter().find(|pack| pack.id == id)
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub schema: u32,
    pub packs: Vec<serde_json::Value>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pack {
    pub id: String,
    pub kind: String,
    pub version: String,
    pub format: u32,
    #[serde(default)]
    pub languages: Vec<String>,
    #[serde(default)]
    pub default_style: Option<String>,
    #[serde(default)]
    pub styles: Vec<Style>,
    #[serde(default)]
    pub sample_rate: Option<u32>,
    pub license: License,
    pub files: Vec<PackFile>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Style {
    pub id: String,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct License {
    pub name: String,
    pub path: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PackFile {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}

impl Pack {
    pub fn bytes(&self) -> u64 {
        self.files.iter().map(|file| file.bytes).sum()
    }
}

impl Manifest {
    /// The listed version of a pack, if its format is one this app loads.
    /// Entries this app can't read (a future shape) are skipped.
    pub fn pack(&self, id: &str) -> Option<Pack> {
        let known = known(id)?;
        self.packs
            .iter()
            .filter_map(|value| serde_json::from_value::<Pack>(value.clone()).ok())
            .find(|pack| pack.id == id && known.formats.contains(&pack.format))
            .filter(|pack| pack.files.iter().all(|file| safe_path(&file.path)))
    }
}

/// Pack file paths stay inside their version folder.
pub fn safe_path(path: &str) -> bool {
    !path.is_empty()
        && !path.contains('\\')
        && path
            .split('/')
            .all(|part| !part.is_empty() && part != "." && part != "..")
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Meta {
    fetched_at: u64,
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs())
        .unwrap_or_default()
}

/// The cached manifest, if any, and whether it is older than a day.
fn cached(dir: &Path) -> (Option<Manifest>, bool) {
    let manifest = std::fs::read(dir.join("manifest.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Manifest>(&bytes).ok());
    let stale = std::fs::read(dir.join("manifest.meta.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Meta>(&bytes).ok())
        .is_none_or(|meta| now_secs().saturating_sub(meta.fetched_at) >= FRESH_FOR.as_secs());
    (manifest, stale)
}

/// The manifest to act on. It is fetched when `refresh` is allowed (once per
/// launch) and the cached copy is over a day old; otherwise, or when offline,
/// the cached copy is used. A manifest with an unknown schema counts as none.
pub async fn load(dir: &Path, refresh: bool) -> Option<Manifest> {
    let (cached, stale) = cached(dir);
    let manifest = if refresh && (stale || cached.is_none()) {
        match fetch(dir).await {
            Ok(fresh) => Some(fresh),
            Err(error) => {
                log::warn!("model manifest: {error}");
                cached
            }
        }
    } else {
        cached
    };
    manifest.filter(|manifest| manifest.schema == SCHEMA)
}

/// The cached manifest, without touching the network.
pub fn cached_now(dir: &Path) -> Option<Manifest> {
    cached(dir).0.filter(|manifest| manifest.schema == SCHEMA)
}

async fn fetch(dir: &Path) -> Result<Manifest> {
    let url = format!("{MODELS_BASE_URL}/manifest.json");
    let bytes = reqwest::get(url).await?.error_for_status()?.bytes().await?;
    let manifest: Manifest = serde_json::from_slice(&bytes)?;
    std::fs::create_dir_all(dir)?;
    write_atomic(&dir.join("manifest.json"), &bytes)?;
    let meta = serde_json::to_vec(&Meta {
        fetched_at: now_secs(),
    })?;
    write_atomic(&dir.join("manifest.meta.json"), &meta)?;
    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manifest(format: u32, path: &str) -> Manifest {
        let pack = serde_json::json!({
            "id": "supertonic-3", "kind": "voice", "version": "1", "format": format,
            "license": { "name": "OpenRAIL-M", "path": "LICENSE" },
            "files": [{ "path": path, "bytes": 3, "sha256": "00" }],
            "futureField": true,
        });
        Manifest {
            schema: 1,
            packs: vec![pack, serde_json::json!({ "id": "something-else" })],
        }
    }

    #[test]
    fn skips_formats_the_app_cannot_load() {
        assert!(manifest(1, "a.onnx").pack("supertonic-3").is_some());
        assert!(manifest(2, "a.onnx").pack("supertonic-3").is_none());
        assert!(manifest(1, "a.onnx").pack("unknown").is_none());
    }

    #[test]
    fn rejects_paths_that_leave_the_pack_folder() {
        for path in ["../x", "a/../../x", "/x", "a\\b", "", "a//b"] {
            assert!(manifest(1, path).pack("supertonic-3").is_none(), "{path}");
        }
    }
}
