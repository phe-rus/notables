//! The natural voice (spec 0001): Supertonic running on the device through
//! ONNX Runtime. Nothing leaves the device; the model arrives as a model
//! pack. Synthesis runs one request at a time on a worker thread; at most two
//! versions stay loaded, and an idle voice is unloaded after ten minutes so
//! phones don't hold the model in memory.

pub mod commands;
mod error;
mod model;
mod text;

use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;

use crate::models::{Models, Pack};
pub use error::{Result, VoiceError};
use model::Model;

/// The model pack that carries the voice.
pub const PACK_ID: &str = "supertonic-3";
/// Versions kept loaded at once (the current one, and one being replaced).
const MAX_LOADED: usize = 2;
/// An unused voice is unloaded after this long.
const IDLE_UNLOAD: Duration = Duration::from_secs(10 * 60);
/// The pace range that still sounds natural.
const SPEED_RANGE: (f32, f32) = (0.8, 1.5);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceInfo {
    version: String,
    languages: Vec<String>,
    styles: Vec<crate::models::Style>,
    default_style: Option<String>,
    sample_rate: Option<u32>,
}

/// Checks once a minute whether the voice has gone idle.
pub fn start_idle_unloading(app: tauri::AppHandle) {
    use tauri::Manager;
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(60));
            app.state::<Voice>().unload_if_idle();
        }
    });
}

#[derive(Default)]
struct Loaded {
    /// Most recently used last.
    models: Vec<Model>,
    last_used: Option<Instant>,
}

#[derive(Default)]
pub struct Voice {
    loaded: Mutex<Loaded>,
}

impl VoiceInfo {
    fn from_pack(pack: Pack) -> Self {
        Self {
            version: pack.version,
            languages: pack.languages,
            styles: pack.styles,
            default_style: pack.default_style,
            sample_rate: pack.sample_rate,
        }
    }
}

impl Voice {
    pub fn info(models: &Models) -> Option<VoiceInfo> {
        models
            .installed(PACK_ID)
            .map(|(_, pack)| VoiceInfo::from_pack(pack))
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Loaded> {
        self.loaded
            .lock()
            .unwrap_or_else(|poison| poison.into_inner())
    }

    /// Loads `version` if needed and moves it to the most recent slot.
    /// Only a version folder whose files all matched their checksums (it
    /// has its pack record) can load.
    fn ensure(loaded: &mut Loaded, models: &Models, version: &str) -> Result<()> {
        if let Some(index) = loaded.models.iter().position(|m| m.version == version) {
            let model = loaded.models.remove(index);
            loaded.models.push(model);
            return Ok(());
        }
        let (current, _) = models.installed(PACK_ID).ok_or(VoiceError::NotInstalled)?;
        if version.is_empty() || version.contains(['/', '\\']) || version.contains("..") {
            return Err(VoiceError::NotInstalled);
        }
        let folder = current.with_file_name(version);
        let record =
            std::fs::read(folder.join("pack.json")).map_err(|_| VoiceError::NotInstalled)?;
        let pack: Pack = serde_json::from_slice(&record)?;
        let model = Model::load(&folder, &pack)?;
        if loaded.models.len() >= MAX_LOADED {
            loaded.models.remove(0);
        }
        loaded.models.push(model);
        Ok(())
    }

    /// Loads the installed version ahead of speaking. Blocking.
    pub fn warm(&self, models: &Models) {
        let Some((_, pack)) = models.installed(PACK_ID) else {
            return;
        };
        let mut loaded = self.lock();
        loaded.last_used = Some(Instant::now());
        if let Err(error) = Self::ensure(&mut loaded, models, &pack.version) {
            log::warn!("natural voice: {error}");
        }
    }

    /// Speaks text with a given pack version. Blocking.
    pub fn synthesize(
        &self,
        models: &Models,
        text: &str,
        lang: &str,
        version: &str,
        style: Option<&str>,
        speed: f32,
    ) -> Result<Vec<f32>> {
        let base = lang.split(['-', '_']).next().unwrap_or(lang).to_lowercase();
        let speed = if speed.is_finite() { speed } else { 1.0 };
        let speed = speed.clamp(SPEED_RANGE.0, SPEED_RANGE.1);
        let mut loaded = self.lock();
        Self::ensure(&mut loaded, models, version)?;
        loaded.last_used = Some(Instant::now());
        let model = loaded.models.last_mut().ok_or(VoiceError::NotInstalled)?;
        model.synthesize(text, &base, style, speed)
    }

    /// Drops every loaded session, waiting for any synthesis in progress.
    pub fn unload_all(&self) {
        let mut loaded = self.lock();
        loaded.models.clear();
    }

    /// Unloads the voice when it has gone unused; skips if it is speaking.
    pub fn unload_if_idle(&self) {
        let Ok(mut loaded) = self.loaded.try_lock() else {
            return;
        };
        if loaded
            .last_used
            .is_some_and(|used| used.elapsed() >= IDLE_UNLOAD)
        {
            loaded.models.clear();
            loaded.last_used = None;
        }
    }
}
