//! The `media` URI scheme: serves stored photos and recordings to the
//! WebView with byte-range support, so audio and video seek and stream
//! straight from disk.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use tauri::http::{Request, Response, StatusCode, header};
use tauri::{Manager, Runtime, UriSchemeContext, UriSchemeResponder};

use super::Storage;

pub const SCHEME: &str = "media";

/// Open-ended ranges (`bytes=0-`) are answered in chunks of this size.
const MAX_CHUNK: u64 = 4 * 1024 * 1024;

pub fn handle<R: Runtime>(
    context: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let app = context.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let id = request.uri().path().trim_start_matches('/').to_owned();
        let range = request
            .headers()
            .get(header::RANGE)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned);
        if request.method() == tauri::http::Method::OPTIONS {
            return responder.respond(preflight());
        }
        let found = app.state::<Storage>().media_file(&id).ok().flatten();
        let response = match found {
            Some((file, mime_type)) => serve(&file, &mime_type, range.as_deref()),
            None => status(StatusCode::NOT_FOUND),
        };
        responder.respond(response);
    });
}

pub(super) fn serve(file: &Path, mime_type: &str, range: Option<&str>) -> Response<Vec<u8>> {
    let Ok(mut handle) = File::open(file) else {
        return status(StatusCode::NOT_FOUND);
    };
    let Ok(size) = handle.metadata().map(|meta| meta.len()) else {
        return status(StatusCode::INTERNAL_SERVER_ERROR);
    };
    let builder = Response::builder()
        // The app's origin differs from `media://` on every platform.
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(
            header::ACCESS_CONTROL_EXPOSE_HEADERS,
            "Content-Range, Accept-Ranges",
        )
        .header(header::CONTENT_TYPE, mime_type)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(
            header::CACHE_CONTROL,
            "private, max-age=31536000, immutable",
        );

    let Some(range) = range else {
        let mut body = Vec::with_capacity(size as usize);
        return match handle.read_to_end(&mut body) {
            Ok(_) => builder
                .body(body)
                .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR)),
            Err(_) => status(StatusCode::INTERNAL_SERVER_ERROR),
        };
    };

    let Some((start, end)) = parse_range(range, size) else {
        return Response::builder()
            .status(StatusCode::RANGE_NOT_SATISFIABLE)
            .header(header::CONTENT_RANGE, format!("bytes */{size}"))
            .body(Vec::new())
            .unwrap_or_else(|_| status(StatusCode::RANGE_NOT_SATISFIABLE));
    };
    let mut body = vec![0; (end - start + 1) as usize];
    if handle.seek(SeekFrom::Start(start)).is_err() || handle.read_exact(&mut body).is_err() {
        return status(StatusCode::INTERNAL_SERVER_ERROR);
    }
    builder
        .status(StatusCode::PARTIAL_CONTENT)
        .header(header::CONTENT_RANGE, format!("bytes {start}-{end}/{size}"))
        .body(body)
        .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR))
}

/// Parses a single `bytes=` range into inclusive offsets within `size`.
fn parse_range(header: &str, size: u64) -> Option<(u64, u64)> {
    let spec = header.strip_prefix("bytes=")?.split(',').next()?.trim();
    let (first, last) = spec.split_once('-')?;
    let (start, end) = match (first.trim(), last.trim()) {
        ("", suffix) => {
            let length: u64 = suffix.parse().ok()?;
            (size.checked_sub(length.min(size))?, size.checked_sub(1)?)
        }
        (start, "") => {
            let start: u64 = start.parse().ok()?;
            (start, (start + MAX_CHUNK - 1).min(size.checked_sub(1)?))
        }
        (start, end) => {
            let end: u64 = end.parse().ok()?;
            (start.parse().ok()?, end.min(size.checked_sub(1)?))
        }
    };
    (start <= end && start < size).then_some((start, end))
}

/// Range requests from the page are preflighted; allow them.
fn preflight() -> Response<Vec<u8>> {
    Response::builder()
        .status(StatusCode::NO_CONTENT)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
        .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "Range")
        .body(Vec::new())
        .unwrap_or_else(|_| status(StatusCode::NO_CONTENT))
}

pub(super) fn status(code: StatusCode) -> Response<Vec<u8>> {
    let mut response = Response::new(Vec::new());
    *response.status_mut() = code;
    response.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        header::HeaderValue::from_static("*"),
    );
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ranges() {
        assert_eq!(parse_range("bytes=0-99", 1000), Some((0, 99)));
        assert_eq!(parse_range("bytes=900-", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=-100", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=0-5000", 1000), Some((0, 999)));
        assert_eq!(
            parse_range("bytes=0-", 10 * MAX_CHUNK),
            Some((0, MAX_CHUNK - 1))
        );
        assert_eq!(parse_range("bytes=1000-", 1000), None);
        assert_eq!(parse_range("bytes=5-1", 1000), None);
        assert_eq!(parse_range("bytes=0-1", 0), None);
        assert_eq!(parse_range("items=0-1", 1000), None);
    }

    #[test]
    fn serves_whole_files_and_ranges() {
        let file = std::env::temp_dir().join("notables-protocol-test");
        std::fs::write(&file, b"0123456789").unwrap();

        let whole = serve(&file, "audio/mp4", None);
        assert_eq!(whole.status(), StatusCode::OK);
        assert_eq!(whole.body(), b"0123456789");

        let part = serve(&file, "audio/mp4", Some("bytes=2-4"));
        assert_eq!(part.status(), StatusCode::PARTIAL_CONTENT);
        assert_eq!(part.body(), b"234");
        assert_eq!(part.headers()[header::CONTENT_RANGE], "bytes 2-4/10");

        let beyond = serve(&file, "audio/mp4", Some("bytes=20-"));
        assert_eq!(beyond.status(), StatusCode::RANGE_NOT_SATISFIABLE);
        std::fs::remove_file(file).unwrap();
    }
}
