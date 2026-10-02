//! Linux only: WebKitGTK's media player (GStreamer) can't read from the
//! app's `media://` scheme, so audio and video would never play. Stored
//! media is served to it over HTTP instead, on 127.0.0.1 with a random port
//! and a secret token that changes every launch, with the same byte ranges.

use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};

use tauri::http::{Response, StatusCode};
use tauri::{AppHandle, Manager};

use super::Storage;
use super::protocol::{serve, status};

pub struct MediaServer {
    /// `http://127.0.0.1:<port>/<token>`; a media id is appended.
    pub base: String,
}

impl MediaServer {
    pub fn start(app: AppHandle) -> std::io::Result<Self> {
        let listener = TcpListener::bind("127.0.0.1:0")?;
        let port = listener.local_addr()?.port();
        let token: String = (0..32)
            .map(|_| format!("{:x}", rand::random::<u8>() & 0xf))
            .collect();
        let prefix = format!("/{token}/");
        std::thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let app = app.clone();
                let prefix = prefix.clone();
                std::thread::spawn(move || {
                    if let Err(error) = answer(&app, &prefix, stream) {
                        log::debug!("media server: {error}");
                    }
                });
            }
        });
        Ok(Self {
            base: format!("http://127.0.0.1:{port}/{token}"),
        })
    }
}

fn answer(app: &AppHandle, prefix: &str, mut stream: TcpStream) -> std::io::Result<()> {
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut line = String::new();
    reader.read_line(&mut line)?;
    let mut parts = line.split_whitespace();
    let method = parts.next().unwrap_or_default().to_owned();
    let path = parts.next().unwrap_or_default().to_owned();
    let mut range = None;
    loop {
        let mut header = String::new();
        if reader.read_line(&mut header)? == 0 || header == "\r\n" || header == "\n" {
            break;
        }
        if let Some((name, value)) = header.split_once(':')
            && name.trim().eq_ignore_ascii_case("range")
        {
            range = Some(value.trim().to_owned());
        }
    }

    let id = path.strip_prefix(prefix).filter(|id| {
        !id.is_empty()
            && id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    });
    let response = match (method.as_str(), id) {
        ("GET" | "HEAD", Some(id)) => match app.state::<Storage>().media_file(id).ok().flatten() {
            Some((file, mime_type)) => serve(&file, &mime_type, range.as_deref()),
            None => status(StatusCode::NOT_FOUND),
        },
        _ => status(StatusCode::NOT_FOUND),
    };
    write(&mut stream, response, method == "HEAD")
}

fn write(stream: &mut TcpStream, response: Response<Vec<u8>>, head: bool) -> std::io::Result<()> {
    let code = response.status();
    let mut out = format!(
        "HTTP/1.1 {} {}\r\nContent-Length: {}\r\nConnection: close\r\n",
        code.as_u16(),
        code.canonical_reason().unwrap_or(""),
        response.body().len()
    );
    for (name, value) in response.headers() {
        if let Ok(value) = value.to_str() {
            out.push_str(&format!("{name}: {value}\r\n"));
        }
    }
    out.push_str("\r\n");
    stream.write_all(out.as_bytes())?;
    if !head {
        stream.write_all(response.body())?;
    }
    stream.flush()
}
