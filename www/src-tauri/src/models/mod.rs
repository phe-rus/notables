//! Model packs (spec 0001): versioned, checksummed downloads served from
//! `notables.pherus.org/models`. One system delivers the natural voice and
//! the Whisper model. A pack version is loaded only after every file has
//! matched its checksum; downloads resume after an interruption; at most one
//! download per pack runs at a time.

pub mod commands;
mod download;
mod error;
mod files;
mod installed;
mod manifest;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub use error::{ModelsError, Result};
use installed::{Installed, InstalledPack};
use manifest::{KNOWN_PACKS, MODELS_BASE_URL, Manifest, known};
pub use manifest::{Pack, Style};

/// The single progress channel to the WebView.
const STATUS_EVENT: &str = "models://status";
/// Progress events are spaced out to about four a second.
const EMIT_EVERY: Duration = Duration::from_millis(250);
/// Free space kept beyond the download: the larger of 10% or 50 MB.
const SPACE_MARGIN_MIN: u64 = 50 * 1024 * 1024;
/// Each installed version folder keeps its manifest entry here.
const PACK_RECORD: &str = "pack.json";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum State {
    Absent,
    Waiting,
    Downloading,
    Verifying,
    Ready,
    Updating,
    Failed,
    NoSpace,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackStatus {
    id: &'static str,
    kind: &'static str,
    pub state: State,
    installed_version: Option<String>,
    available_version: Option<String>,
    /// The pack's size: the listed version's, else the installed one's.
    pub bytes: Option<u64>,
    pub received_bytes: u64,
    /// Why the last download failed: `network`, `checksum`, `server` or `no-space`.
    reason: Option<&'static str>,
    /// The license name, and where to read it before the pack is downloaded.
    license: Option<String>,
    license_url: Option<String>,
}

/// Someone following one download's progress besides the WebView events.
pub type Observer<'a> = Option<&'a (dyn Fn(&PackStatus) + Send + Sync)>;

/// A download in flight, or the outcome of the last one this launch.
struct Live {
    state: State,
    received: u64,
    reason: Option<&'static str>,
    cancel: Arc<AtomicBool>,
    emitted: Option<Instant>,
}

pub struct Models {
    dir: PathBuf,
    client: reqwest::Client,
    live: Mutex<HashMap<&'static str, Live>>,
    locks: HashMap<&'static str, tokio::sync::Mutex<()>>,
    /// Whether this launch already looked for a newer manifest.
    refreshed: AtomicBool,
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs())
        .unwrap_or_default()
}

impl Models {
    pub fn new(app_data: &Path) -> Self {
        Self {
            dir: app_data.join("models"),
            client: reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(20))
                .build()
                .unwrap_or_default(),
            live: Mutex::default(),
            locks: KNOWN_PACKS
                .iter()
                .map(|pack| (pack.id, tokio::sync::Mutex::new(())))
                .collect(),
            refreshed: AtomicBool::new(false),
        }
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    /// Moves a file an earlier version of the app downloaded outside the
    /// pack system into the listed version's folder, once its checksum
    /// matches; a mismatching file is deleted. The pack's other files then
    /// download as usual.
    pub async fn adopt(&self, app: &AppHandle, id: &str, legacy: &Path) -> Result<()> {
        let id = known(id)
            .ok_or_else(|| ModelsError::UnknownPack(id.to_owned()))?
            .id;
        if self.installed(id).is_some() || !legacy.exists() {
            return Ok(());
        }
        {
            let _lock = self.locks[id].lock().await;
            if !legacy.exists() {
                return Ok(());
            }
            let pack = self
                .manifest()
                .await
                .and_then(|manifest| manifest.pack(id))
                .ok_or(ModelsError::NoManifest)?;
            let name = legacy
                .file_name()
                .map(|name| name.to_string_lossy().into_owned());
            let Some(file) = pack
                .files
                .iter()
                .find(|file| Some(&file.path) == name.as_ref())
            else {
                return Ok(());
            };
            let hashed = legacy.to_path_buf();
            let digest = tauri::async_runtime::spawn_blocking(move || files::sha256_hex(&hashed))
                .await
                .map_err(|_| ModelsError::Interrupted)??;
            if !digest.eq_ignore_ascii_case(&file.sha256) {
                std::fs::remove_file(legacy)?;
                return Ok(());
            }
            let target = self.dir.join(id).join(&pack.version).join(&file.path);
            if let Some(folder) = target.parent() {
                std::fs::create_dir_all(folder)?;
            }
            std::fs::rename(legacy, &target)?;
        }
        self.download(app, id).await.map(|_| ())
    }

    /// The folder and manifest entry of a pack's installed version.
    pub fn installed(&self, id: &str) -> Option<(PathBuf, Pack)> {
        let installed = Installed::load(&self.dir);
        let version = &installed.packs.get(id)?.version;
        let folder = self.dir.join(id).join(version);
        let record = std::fs::read(folder.join(PACK_RECORD)).ok()?;
        let pack = serde_json::from_slice(&record).ok()?;
        Some((folder, pack))
    }

    /// The license text bundled with an installed pack.
    pub fn license_text(&self, id: &str) -> Option<String> {
        let (folder, pack) = self.installed(id)?;
        if !manifest::safe_path(&pack.license.path) {
            return None;
        }
        std::fs::read_to_string(folder.join(&pack.license.path)).ok()
    }

    async fn manifest(&self) -> Option<Manifest> {
        let refresh = !self.refreshed.swap(true, Ordering::SeqCst);
        manifest::load(&self.dir, refresh).await
    }

    fn live_state(&self, id: &str) -> Option<(State, u64, Option<&'static str>)> {
        let live = self.live.lock().ok()?;
        live.get(id).map(|l| (l.state, l.received, l.reason))
    }

    fn status_of(
        &self,
        id: &'static str,
        manifest: Option<&Manifest>,
        installed: &Installed,
    ) -> PackStatus {
        let kind = known(id).map_or("voice", |pack| pack.kind);
        let current = installed.packs.get(id);
        let available = manifest.and_then(|manifest| manifest.pack(id));
        let live = self.live_state(id);
        let state = match (live, current) {
            (Some((State::Downloading, ..)), Some(_)) => State::Updating,
            (Some((State::Verifying, ..)), _) => State::Verifying,
            (Some((State::Downloading, ..)), None) => State::Downloading,
            // A failed update leaves the installed version in use.
            (_, Some(_)) => State::Ready,
            (Some((state, ..)), None) => state,
            (None, None) => State::Absent,
        };
        PackStatus {
            id,
            kind,
            state,
            installed_version: current.map(|pack| pack.version.clone()),
            available_version: available.as_ref().map(|pack| pack.version.clone()),
            bytes: available
                .as_ref()
                .map(Pack::bytes)
                .or(current.map(|pack| pack.bytes)),
            received_bytes: live.map_or(0, |(_, received, _)| received),
            reason: live.and_then(|(_, _, reason)| reason),
            license: available
                .as_ref()
                .map(|pack| pack.license.name.clone())
                .or_else(|| self.installed(id).map(|(_, pack)| pack.license.name)),
            license_url: available.as_ref().map(|pack| {
                format!(
                    "{MODELS_BASE_URL}/{}/{}/{}",
                    pack.id, pack.version, pack.license.path
                )
            }),
        }
    }

    pub async fn status(&self) -> Vec<PackStatus> {
        let manifest = self.manifest().await;
        let installed = Installed::load(&self.dir);
        KNOWN_PACKS
            .iter()
            .map(|pack| self.status_of(pack.id, manifest.as_ref(), &installed))
            .collect()
    }

    async fn emit_status(&self, app: &AppHandle, id: &'static str) -> PackStatus {
        let manifest = self.manifest().await;
        let status = self.status_of(id, manifest.as_ref(), &Installed::load(&self.dir));
        let _ = app.emit(STATUS_EVENT, &status);
        status
    }

    /// Records progress and emits it, spaced out unless the state changed.
    fn progress(
        &self,
        app: &AppHandle,
        observer: Observer<'_>,
        template: &mut PackStatus,
        state: State,
        received: u64,
    ) {
        let Ok(mut live) = self.live.lock() else {
            return;
        };
        let Some(entry) = live.get_mut(template.id) else {
            return;
        };
        let changed = entry.state != state;
        entry.state = state;
        entry.received = received;
        let due = entry.emitted.is_none_or(|at| at.elapsed() >= EMIT_EVERY);
        if !(changed || due) {
            return;
        }
        entry.emitted = Some(Instant::now());
        drop(live);
        template.state = match (state, &template.installed_version) {
            (State::Downloading, Some(_)) => State::Updating,
            (state, _) => state,
        };
        template.received_bytes = received;
        let _ = app.emit(STATUS_EVENT, &*template);
        if let Some(observer) = observer {
            observer(template);
        }
    }

    /// Marks a pack as downloading, or joins the download already running.
    fn begin(&self, id: &'static str) -> Arc<AtomicBool> {
        let mut live = self
            .live
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        if let Some(entry) = live.get(id)
            && matches!(entry.state, State::Downloading | State::Verifying)
        {
            return entry.cancel.clone();
        }
        let cancel = Arc::new(AtomicBool::new(false));
        live.insert(
            id,
            Live {
                state: State::Downloading,
                received: 0,
                reason: None,
                cancel: cancel.clone(),
                emitted: None,
            },
        );
        cancel
    }

    fn settle(&self, id: &'static str, outcome: &Result<()>) {
        let mut live = self
            .live
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        match outcome {
            Ok(()) | Err(ModelsError::Cancelled) => {
                live.remove(id);
            }
            Err(error) => {
                if let Some(entry) = live.get_mut(id) {
                    entry.state = match error {
                        ModelsError::NoSpace => State::NoSpace,
                        _ => State::Failed,
                    };
                    entry.reason = Some(error.reason());
                }
            }
        }
    }

    /// Downloads (or updates to) the listed version of a pack. A second call
    /// while one runs waits for it and returns its outcome.
    pub async fn download(&self, app: &AppHandle, id: &str) -> Result<PackStatus> {
        self.download_observed(app, id, None).await
    }

    /// `download`, also reporting progress to `observer`.
    pub async fn download_observed(
        &self,
        app: &AppHandle,
        id: &str,
        observer: Observer<'_>,
    ) -> Result<PackStatus> {
        let id = known(id)
            .ok_or_else(|| ModelsError::UnknownPack(id.to_owned()))?
            .id;
        let cancel = self.begin(id);
        let _lock = self.locks[id].lock().await;
        let manifest = self.manifest().await;
        let installed = Installed::load(&self.dir);
        let pack = manifest.as_ref().and_then(|manifest| manifest.pack(id));
        let outcome = match pack {
            _ if cancel.load(Ordering::SeqCst) => Err(ModelsError::Cancelled),
            None => Err(ModelsError::NoManifest),
            Some(pack) if installed.packs.get(id).map(|p| &p.version) == Some(&pack.version) => {
                Ok(())
            }
            Some(pack) => {
                let template = self.status_of(id, manifest.as_ref(), &installed);
                self.fetch_pack(app, observer, &pack, template, &cancel)
                    .await
            }
        };
        self.settle(id, &outcome);
        let status = self.emit_status(app, id).await;
        outcome.map(|()| status)
    }

    async fn fetch_pack(
        &self,
        app: &AppHandle,
        observer: Observer<'_>,
        pack: &Pack,
        mut template: PackStatus,
        cancel: &Arc<AtomicBool>,
    ) -> Result<()> {
        let folder = self.dir.join(&pack.id).join(&pack.version);
        let total = pack.bytes();
        let mut received: u64 = pack
            .files
            .iter()
            .map(|file| download::bytes_on_disk(&folder.join(&file.path), file.bytes))
            .sum();

        let needed = total.saturating_sub(received) + (total / 10).max(SPACE_MARGIN_MIN);
        if files::available_space(&folder)? < needed {
            return Err(ModelsError::NoSpace);
        }
        self.progress(app, observer, &mut template, State::Downloading, received);

        for file in &pack.files {
            let url = format!(
                "{MODELS_BASE_URL}/{}/{}/{}",
                pack.id, pack.version, file.path
            );
            let target = folder.join(&file.path);
            let mut on_step = |step: download::Step| match step {
                download::Step::Received(bytes) => {
                    received += bytes;
                    self.progress(app, observer, &mut template, State::Downloading, received);
                }
                download::Step::Verifying => {
                    self.progress(app, observer, &mut template, State::Verifying, received);
                }
            };
            download::file(&self.client, &url, &target, file, cancel, &mut on_step).await?;
            self.progress(app, observer, &mut template, State::Downloading, received);
        }

        files::write_atomic(&folder.join(PACK_RECORD), &serde_json::to_vec(pack)?)?;
        let mut installed = Installed::load(&self.dir);
        installed.packs.insert(
            pack.id.clone(),
            InstalledPack {
                version: pack.version.clone(),
                bytes: total,
                installed_at: now_secs(),
            },
        );
        // The previous version's folder goes at the next launch, once
        // nothing can still be reading it.
        installed.save(&self.dir)
    }

    /// The automatic policy: fetch missing voice packs and newer versions of
    /// installed packs, unless the connection is metered and mobile data is
    /// not allowed. Never fails; outcomes become pack states.
    pub async fn auto(&self, app: &AppHandle, allow_metered: bool) {
        // Desktop connections count as unmetered. Phones count as metered
        // until the native connection check arrives with the mobile projects.
        let metered = cfg!(mobile);
        let manifest = self.manifest().await;
        let installed = Installed::load(&self.dir);
        for known in KNOWN_PACKS {
            let Some(available) = manifest.as_ref().and_then(|m| m.pack(known.id)) else {
                continue;
            };
            let wanted = match installed.packs.get(known.id) {
                None => known.kind == "voice",
                Some(current) => current.version != available.version,
            };
            if !wanted {
                continue;
            }
            if metered && !allow_metered {
                self.wait_for_unmetered(app, known.id).await;
                continue;
            }
            if let Err(error) = self.download(app, known.id).await {
                log::warn!("model pack {}: {error}", known.id);
            }
        }
    }

    async fn wait_for_unmetered(&self, app: &AppHandle, id: &'static str) {
        {
            let mut live = self
                .live
                .lock()
                .unwrap_or_else(|poison| poison.into_inner());
            if live
                .get(id)
                .is_some_and(|entry| matches!(entry.state, State::Downloading | State::Verifying))
            {
                return;
            }
            live.insert(
                id,
                Live {
                    state: State::Waiting,
                    received: 0,
                    reason: None,
                    cancel: Arc::new(AtomicBool::new(false)),
                    emitted: None,
                },
            );
        }
        self.emit_status(app, id).await;
    }

    /// Removes a pack: cancels its download, runs `unload` (which waits for
    /// any synthesis in progress and drops loaded sessions), then deletes the
    /// folder. A folder the OS refuses to delete goes at the next launch.
    pub async fn delete(
        &self,
        app: &AppHandle,
        id: &str,
        unload: impl FnOnce() + Send + 'static,
    ) -> Result<()> {
        let id = known(id)
            .ok_or_else(|| ModelsError::UnknownPack(id.to_owned()))?
            .id;
        if let Ok(live) = self.live.lock()
            && let Some(entry) = live.get(id)
        {
            entry.cancel.store(true, Ordering::SeqCst);
        }
        let _lock = self.locks[id].lock().await;
        tauri::async_runtime::spawn_blocking(unload)
            .await
            .map_err(|_| ModelsError::Interrupted)?;

        let mut installed = Installed::load(&self.dir);
        installed.packs.remove(id);
        let folder = self.dir.join(id);
        if folder.exists()
            && let Err(error) = std::fs::remove_dir_all(&folder)
        {
            log::warn!("deleting {id} later: {error}");
            installed.pending_delete.push(id.to_owned());
        }
        installed.save(&self.dir)?;
        if let Ok(mut live) = self.live.lock() {
            live.remove(id);
        }
        self.emit_status(app, id).await;
        Ok(())
    }

    /// Launch housekeeping, before anything loads a model: finish deletes the
    /// OS refused, and remove version folders that are neither installed nor
    /// the listed version (old versions after an update, abandoned partial
    /// downloads).
    pub fn clean_up(&self) {
        let mut installed = Installed::load(&self.dir);
        let pending = installed.pending_delete.len();
        installed.pending_delete.retain(|relative| {
            let folder = self.dir.join(relative);
            folder.exists() && std::fs::remove_dir_all(&folder).is_err()
        });
        let listed = manifest::cached_now(&self.dir);
        for known in KNOWN_PACKS {
            let Ok(entries) = std::fs::read_dir(self.dir.join(known.id)) else {
                continue;
            };
            let current = installed
                .packs
                .get(known.id)
                .map(|pack| pack.version.clone());
            let available = listed
                .as_ref()
                .and_then(|m| m.pack(known.id))
                .map(|p| p.version);
            for entry in entries.flatten() {
                let version = entry.file_name().to_string_lossy().into_owned();
                if Some(&version) != current.as_ref() && Some(&version) != available.as_ref() {
                    let _ = std::fs::remove_dir_all(entry.path());
                }
            }
        }
        if installed.pending_delete.len() != pending
            && let Err(error) = installed.save(&self.dir)
        {
            log::warn!("model cleanup: {error}");
        }
    }
}
