//! Storage commands for the WebView. Binary payloads travel as raw IPC
//! bodies with their identifiers in headers; every call runs on a blocking
//! worker so SQLite and file I/O never stall the UI thread.

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager};

use super::Storage;
use super::documents;
use super::error::{Result, StorageError};

async fn with_storage<T: Send + 'static>(
    app: AppHandle,
    work: impl FnOnce(&Storage) -> Result<T> + Send + 'static,
) -> Result<T> {
    tauri::async_runtime::spawn_blocking(move || work(&app.state::<Storage>()))
        .await
        .map_err(|_| StorageError::Interrupted)?
}

fn raw_body(request: &Request<'_>) -> Result<Vec<u8>> {
    match request.body() {
        InvokeBody::Raw(bytes) => Ok(bytes.clone()),
        InvokeBody::Json(_) => Err(StorageError::MissingInput("binary body")),
    }
}

fn header(request: &Request<'_>, name: &'static str) -> Result<String> {
    request
        .headers()
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned)
        .ok_or(StorageError::MissingInput(name))
}

// Documents

/// Every stored update for a document, framed as `[u32 LE length][bytes]…`.
#[tauri::command]
pub async fn storage_document_load(app: AppHandle, document: String) -> Result<Response> {
    let updates = with_storage(app, move |storage| storage.document_updates(&document)).await?;
    Ok(Response::new(documents::frame(&updates)))
}

/// Body: one Yjs update. Header `x-document`: the document name.
#[tauri::command]
pub async fn storage_document_append(app: AppHandle, request: Request<'_>) -> Result<()> {
    let (document, update) = (header(&request, "x-document")?, raw_body(&request)?);
    with_storage(app, move |storage| {
        storage.append_document_update(&document, &update)
    })
    .await
}

/// Body: the full document state, replacing its log. Header `x-document`.
#[tauri::command]
pub async fn storage_document_replace(app: AppHandle, request: Request<'_>) -> Result<()> {
    let (document, state) = (header(&request, "x-document")?, raw_body(&request)?);
    with_storage(app, move |storage| {
        storage.replace_document(&document, &state)
    })
    .await
}

#[tauri::command]
pub async fn storage_document_remove(app: AppHandle, document: String) -> Result<()> {
    with_storage(app, move |storage| storage.remove_document(&document)).await
}

// Note content

#[tauri::command]
pub async fn storage_note_content_load(app: AppHandle, note_id: String) -> Result<Option<String>> {
    with_storage(app, move |storage| storage.note_content(&note_id)).await
}

/// `document` is the note's Lexical JSON, stored as text.
#[tauri::command]
pub async fn storage_note_content_save(
    app: AppHandle,
    note_id: String,
    document: String,
) -> Result<()> {
    with_storage(app, move |storage| {
        storage.save_note_content(&note_id, &document)
    })
    .await
}

#[tauri::command]
pub async fn storage_note_content_remove(app: AppHandle, note_id: String) -> Result<()> {
    with_storage(app, move |storage| storage.remove_note_content(&note_id)).await
}

// Media

/// Body: the file. Headers `x-media-id` and `x-media-type`.
#[tauri::command]
pub async fn storage_media_save(app: AppHandle, request: Request<'_>) -> Result<()> {
    let id = header(&request, "x-media-id")?;
    let mime_type = header(&request, "x-media-type")?;
    let bytes = raw_body(&request)?;
    with_storage(app, move |storage| {
        storage.save_media(&id, &mime_type, &bytes)
    })
    .await
}

#[tauri::command]
pub async fn storage_media_remove(app: AppHandle, id: String) -> Result<()> {
    with_storage(app, move |storage| storage.remove_media(&id)).await
}

// Metadata

#[tauri::command]
pub async fn storage_meta_get(app: AppHandle, key: String) -> Result<Option<String>> {
    with_storage(app, move |storage| storage.meta(&key)).await
}

#[tauri::command]
pub async fn storage_meta_set(app: AppHandle, key: String, value: String) -> Result<()> {
    with_storage(app, move |storage| storage.set_meta(&key, &value)).await
}
