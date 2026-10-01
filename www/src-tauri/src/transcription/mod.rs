//! On-device speech-to-text with whisper.cpp. Audio is decoded and
//! resampled to 16 kHz mono in the WebView, sent here as raw samples, and
//! transcribed on a worker thread. Nothing leaves the device except the
//! one-time model download.

pub mod commands;
mod engine;
mod error;
mod model;

pub use engine::Transcriber;
