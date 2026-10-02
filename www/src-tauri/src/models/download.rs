use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use futures_util::StreamExt;
use reqwest::StatusCode;
use reqwest::header::RANGE;
use tokio::io::AsyncWriteExt;

use super::error::{ModelsError, Result};
use super::files::sha256_hex;
use super::manifest::PackFile;

/// The partial file beside a pack file while it downloads.
pub fn part_path(file: &Path) -> PathBuf {
    let mut name = file.as_os_str().to_owned();
    name.push(".part");
    PathBuf::from(name)
}

/// Bytes of a pack file already on disk: the finished file, or its partial copy.
pub fn bytes_on_disk(file: &Path, expected: u64) -> u64 {
    if let Ok(meta) = std::fs::metadata(file) {
        return meta.len().min(expected);
    }
    std::fs::metadata(part_path(file))
        .map(|meta| meta.len().min(expected))
        .unwrap_or(0)
}

/// What a file download is doing, for progress.
pub enum Step {
    /// More bytes arrived.
    Received(u64),
    /// Every byte is in; the checksum is being computed.
    Verifying,
}

/// Downloads one pack file to `target`, resuming a partial copy with a
/// `Range` request. The file takes its final name only once its SHA-256
/// matches the manifest; a mismatching copy is deleted and never loaded.
pub async fn file(
    client: &reqwest::Client,
    url: &str,
    target: &Path,
    expected: &PackFile,
    cancel: &Arc<AtomicBool>,
    on_step: &mut (dyn FnMut(Step) + Send),
) -> Result<()> {
    if std::fs::metadata(target).is_ok_and(|meta| meta.len() == expected.bytes) {
        return Ok(());
    }
    if let Some(dir) = target.parent() {
        tokio::fs::create_dir_all(dir).await?;
    }
    let part = part_path(target);
    let mut have = tokio::fs::metadata(&part)
        .await
        .map(|meta| meta.len())
        .unwrap_or(0);
    if have > expected.bytes {
        tokio::fs::remove_file(&part).await?;
        have = 0;
    }

    if have < expected.bytes {
        let mut request = client.get(url);
        if have > 0 {
            request = request.header(RANGE, format!("bytes={have}-"));
        }
        let response = request.send().await?;
        let status = response.status();
        let mut output = match status {
            StatusCode::PARTIAL_CONTENT => {
                tokio::fs::OpenOptions::new()
                    .append(true)
                    .open(&part)
                    .await?
            }
            StatusCode::OK => {
                // The server sent the whole file: start over.
                have = 0;
                tokio::fs::File::create(&part).await?
            }
            StatusCode::RANGE_NOT_SATISFIABLE => {
                tokio::fs::remove_file(&part).await?;
                return Err(ModelsError::Server(status.as_u16()));
            }
            _ => return Err(ModelsError::Server(status.as_u16())),
        };
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            if cancel.load(Ordering::Relaxed) {
                output.flush().await?;
                return Err(ModelsError::Cancelled);
            }
            let chunk = chunk?;
            have += chunk.len() as u64;
            if have > expected.bytes {
                drop(output);
                tokio::fs::remove_file(&part).await?;
                return Err(ModelsError::Checksum);
            }
            output.write_all(&chunk).await?;
            on_step(Step::Received(chunk.len() as u64));
        }
        output.flush().await?;
        output.sync_all().await?;
        if have < expected.bytes {
            // The connection closed early; the partial copy resumes next time.
            return Err(ModelsError::Interrupted);
        }
    }

    on_step(Step::Verifying);
    let hashed = part.clone();
    let digest = tauri::async_runtime::spawn_blocking(move || sha256_hex(&hashed))
        .await
        .map_err(|_| ModelsError::Interrupted)??;
    if !digest.eq_ignore_ascii_case(&expected.sha256) {
        tokio::fs::remove_file(&part).await?;
        return Err(ModelsError::Checksum);
    }
    tokio::fs::rename(&part, target).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;

    use sha2::{Digest, Sha256};

    use super::*;

    /// Serves `body` over HTTP with `Range` support, stopping each response
    /// after `cut` bytes to simulate a dropped connection.
    fn serve(body: Vec<u8>, cut: Option<usize>) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/file", listener.local_addr().unwrap());
        std::thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                let mut start = 0;
                loop {
                    let mut line = String::new();
                    reader.read_line(&mut line).unwrap();
                    if let Some(range) = line.to_lowercase().strip_prefix("range: bytes=") {
                        start = range.trim().trim_end_matches('-').parse().unwrap();
                    }
                    if line == "\r\n" || line.is_empty() {
                        break;
                    }
                }
                let slice = &body[start..];
                let sent = &slice[..cut.unwrap_or(slice.len()).min(slice.len())];
                let status = if start > 0 {
                    "206 Partial Content"
                } else {
                    "200 OK"
                };
                let mut stream = stream;
                let head = format!(
                    "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    slice.len()
                );
                let _ = stream.write_all(head.as_bytes());
                let _ = stream.write_all(sent);
            }
        });
        url
    }

    fn expected(body: &[u8]) -> PackFile {
        PackFile {
            path: "file".into(),
            bytes: body.len() as u64,
            sha256: Sha256::digest(body)
                .iter()
                .map(|b| format!("{b:02x}"))
                .collect(),
        }
    }

    fn folder(name: &str) -> PathBuf {
        let folder = std::env::temp_dir().join(format!("notables-download-{name}"));
        let _ = std::fs::remove_dir_all(&folder);
        folder
    }

    fn fetch(url: &str, target: &Path, file: &PackFile) -> Result<()> {
        let client = reqwest::Client::new();
        let cancel = Arc::new(AtomicBool::new(false));
        tauri::async_runtime::block_on(super::file(
            &client,
            url,
            target,
            file,
            &cancel,
            &mut |_| {},
        ))
    }

    #[test]
    fn resumes_an_interrupted_download() {
        let body: Vec<u8> = (0..50_000u32).map(|i| (i % 251) as u8).collect();
        let target = folder("resume").join("file");
        let file = expected(&body);

        let dropped = serve(body.clone(), Some(20_000));
        assert!(fetch(&dropped, &target, &file).is_err());
        let kept = std::fs::metadata(part_path(&target)).unwrap().len();
        assert!(kept > 0 && kept < body.len() as u64);
        assert!(!target.exists());

        let working = serve(body.clone(), None);
        fetch(&working, &target, &file).unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), body);
        assert!(!part_path(&target).exists());
    }

    #[test]
    fn discards_a_file_that_fails_its_checksum() {
        let body = b"the real model".to_vec();
        let target = folder("checksum").join("file");
        let mut file = expected(&body);
        file.sha256 = "00".repeat(32);

        let url = serve(body, None);
        assert!(matches!(
            fetch(&url, &target, &file),
            Err(ModelsError::Checksum)
        ));
        assert!(!target.exists());
        assert!(!part_path(&target).exists());
    }
}
