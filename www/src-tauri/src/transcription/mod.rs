//! On-device speech-to-text with whisper.cpp. Short recordings are decoded
//! in the WebView and sent here as raw samples; long ones such as
//! audiobooks are decoded here from their stored files, window by window.
//! Transcription runs on a worker thread. Nothing leaves the device; the
//! model arrives once as the `whisper-base` model pack.

pub mod commands;
mod decode;
mod engine;
mod error;
mod model;

pub use engine::Transcriber;
