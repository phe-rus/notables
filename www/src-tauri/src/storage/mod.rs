//! On-device storage for the native apps. Documents (Yjs update logs),
//! rendered note content and metadata live in one SQLite database; photos
//! and recordings are plain files next to it, served to the WebView through
//! the `media` protocol so large files stream instead of crossing IPC.

pub mod commands;
mod database;
mod documents;
mod error;
mod media;
mod note_content;
pub mod protocol;

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

use error::Result;
pub use error::StorageError;

/// The app's storage: a single SQLite connection and the media folder.
pub struct Storage {
    connection: Mutex<Connection>,
    media_dir: PathBuf,
}

impl Storage {
    /// Opens (or creates) storage inside `data_dir`.
    pub fn open(data_dir: &Path) -> Result<Self> {
        let media_dir = data_dir.join("media");
        std::fs::create_dir_all(&media_dir)?;
        let connection = database::open(&data_dir.join("notables.sqlite3"))?;
        Ok(Self {
            connection: Mutex::new(connection),
            media_dir,
        })
    }

    fn connection(&self) -> Result<MutexGuard<'_, Connection>> {
        self.connection.lock().map_err(|_| StorageError::Poisoned)
    }

    pub fn meta(&self, key: &str) -> Result<Option<String>> {
        database::meta(&*self.connection()?, key)
    }

    pub fn set_meta(&self, key: &str, value: &str) -> Result<()> {
        database::set_meta(&*self.connection()?, key, value)
    }

    pub fn document_updates(&self, document: &str) -> Result<Vec<Vec<u8>>> {
        documents::load(&*self.connection()?, document)
    }

    pub fn append_document_update(&self, document: &str, update: &[u8]) -> Result<()> {
        documents::append(&*self.connection()?, document, update)
    }

    pub fn replace_document(&self, document: &str, state: &[u8]) -> Result<()> {
        documents::replace(&*self.connection()?, document, state)
    }

    pub fn remove_document(&self, document: &str) -> Result<()> {
        documents::remove(&*self.connection()?, document)
    }

    pub fn note_content(&self, note_id: &str) -> Result<Option<String>> {
        note_content::load(&*self.connection()?, note_id)
    }

    pub fn save_note_content(&self, note_id: &str, document: &str) -> Result<()> {
        note_content::save(&*self.connection()?, note_id, document)
    }

    pub fn remove_note_content(&self, note_id: &str) -> Result<()> {
        note_content::remove(&*self.connection()?, note_id)
    }

    pub fn save_media(&self, id: &str, mime_type: &str, bytes: &[u8]) -> Result<()> {
        media::save(&*self.connection()?, &self.media_dir, id, mime_type, bytes)
    }

    /// A stored file's path and type.
    pub fn media_file(&self, id: &str) -> Result<Option<(PathBuf, String)>> {
        media::find(&*self.connection()?, &self.media_dir, id)
    }

    pub fn remove_media(&self, id: &str) -> Result<()> {
        media::remove(&*self.connection()?, &self.media_dir, id)
    }
}
