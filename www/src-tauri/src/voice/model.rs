//! Supertonic inference: four ONNX graphs. The duration predictor sets the
//! length, the text encoder embeds the characters, the vector estimator
//! turns noise into speech latents over a few flow matching steps, and the
//! vocoder renders the latents as audio.

use std::collections::HashMap;
use std::path::Path;

use ort::session::Session;
use ort::value::Tensor;
use serde::Deserialize;

use super::error::{Result, VoiceError};
use super::text;
use crate::models::Pack;

/// Flow matching steps; fewer is faster, more is smoother. Upstream uses
/// 8; 5 reads a 188 character line word for word (checked with Whisper) in
/// two thirds of the time.
const STEPS: usize = 5;
/// Silence between the pieces of a long text.
const GAP_SECONDS: f32 = 0.1;

#[derive(Deserialize)]
struct Config {
    ae: AutoEncoder,
    ttl: TextToLatent,
}

#[derive(Deserialize)]
struct AutoEncoder {
    sample_rate: u32,
    base_chunk_size: usize,
}

#[derive(Deserialize)]
struct TextToLatent {
    chunk_compress_factor: usize,
    latent_dim: usize,
}

#[derive(Deserialize)]
struct StyleFile {
    style_ttl: StyleTensor,
    style_dp: StyleTensor,
}

#[derive(Deserialize)]
struct StyleTensor {
    data: Vec<Vec<Vec<f32>>>,
    dims: Vec<i64>,
}

struct Style {
    ttl: (Vec<i64>, Vec<f32>),
    dp: (Vec<i64>, Vec<f32>),
}

impl StyleTensor {
    fn flatten(self) -> (Vec<i64>, Vec<f32>) {
        let values = self.data.into_iter().flatten().flatten().collect();
        (self.dims, values)
    }
}

pub struct Model {
    pub version: String,
    duration: Session,
    encoder: Session,
    estimator: Session,
    vocoder: Session,
    /// Unicode code point to token id; -1 where the model has no entry.
    indexer: Vec<i64>,
    styles: HashMap<String, Style>,
    languages: Vec<String>,
    default_style: String,
    sample_rate: u32,
    steps: usize,
    /// Audio samples per latent frame.
    frame: usize,
    latent_channels: usize,
}

fn session(path: &Path) -> Result<Session> {
    Ok(Session::builder()?.commit_from_file(path)?)
}

fn tensor<T: ort::value::PrimitiveTensorElementType + Clone + std::fmt::Debug + 'static>(
    shape: Vec<i64>,
    values: Vec<T>,
) -> Result<Tensor<T>> {
    Ok(Tensor::from_array((shape, values))?)
}

impl Model {
    /// Loads a verified pack folder.
    pub fn load(folder: &Path, pack: &Pack) -> Result<Self> {
        let onnx = folder.join("onnx");
        let config: Config = serde_json::from_slice(&std::fs::read(onnx.join("tts.json"))?)?;
        let indexer: Vec<i64> =
            serde_json::from_slice(&std::fs::read(onnx.join("unicode_indexer.json"))?)?;
        let mut styles = HashMap::new();
        for style in &pack.styles {
            let path = folder
                .join("voice_styles")
                .join(format!("{}.json", style.id));
            let file: StyleFile = serde_json::from_slice(&std::fs::read(path)?)?;
            styles.insert(
                style.id.clone(),
                Style {
                    ttl: file.style_ttl.flatten(),
                    dp: file.style_dp.flatten(),
                },
            );
        }
        Ok(Self {
            version: pack.version.clone(),
            duration: session(&onnx.join("duration_predictor.onnx"))?,
            encoder: session(&onnx.join("text_encoder.onnx"))?,
            estimator: session(&onnx.join("vector_estimator.onnx"))?,
            vocoder: session(&onnx.join("vocoder.onnx"))?,
            indexer,
            styles,
            languages: pack.languages.clone(),
            default_style: pack.default_style.clone().unwrap_or_default(),
            sample_rate: config.ae.sample_rate,
            steps: STEPS,
            frame: config.ae.base_chunk_size * config.ttl.chunk_compress_factor,
            latent_channels: config.ttl.latent_dim * config.ttl.chunk_compress_factor,
        })
    }

    fn token(&self, c: char) -> i64 {
        self.indexer.get(c as usize).copied().unwrap_or(-1)
    }

    /// Speaks `text` in `lang` (a base language code) with a style, at a
    /// speed (1 is the model's natural pace). Returns mono f32 samples.
    pub fn synthesize(
        &mut self,
        text: &str,
        lang: &str,
        style: Option<&str>,
        speed: f32,
    ) -> Result<Vec<f32>> {
        if !self.languages.iter().any(|known| known == lang) {
            return Err(VoiceError::UnsupportedLanguage(lang.to_owned()));
        }
        let style_id = style
            .filter(|id| self.styles.contains_key(*id))
            .unwrap_or(&self.default_style)
            .to_owned();
        let gap = vec![0.0; (GAP_SECONDS * self.sample_rate as f32) as usize];
        let mut audio = Vec::new();
        for piece in text::chunks(text) {
            let clean = text::keep_known(&text::normalize(&piece), |c| self.token(c) >= 0);
            if clean.is_empty() {
                continue;
            }
            if !audio.is_empty() {
                audio.extend_from_slice(&gap);
            }
            let samples = self.piece(&text::tagged(&clean, lang), &style_id, speed)?;
            audio.extend(samples);
        }
        Ok(audio)
    }

    fn piece(&mut self, tagged: &str, style_id: &str, speed: f32) -> Result<Vec<f32>> {
        let style = self.styles.get(style_id).ok_or(VoiceError::UnknownStyle)?;
        let (ttl_shape, ttl) = (style.ttl.0.clone(), style.ttl.1.clone());
        let (dp_shape, dp) = (style.dp.0.clone(), style.dp.1.clone());
        let ids: Vec<i64> = tagged.chars().map(|c| self.token(c).max(0)).collect();
        let length = ids.len() as i64;
        let text_mask = || tensor(vec![1, 1, length], vec![1.0f32; ids.len()]);
        let text_ids = || tensor(vec![1, length], ids.clone());

        let outputs = self.duration.run(ort::inputs! {
            "text_ids" => text_ids()?,
            "style_dp" => tensor(dp_shape, dp)?,
            "text_mask" => text_mask()?,
        })?;
        let seconds = outputs["duration"].try_extract_tensor::<f32>()?.1[0] / speed;
        drop(outputs);

        let outputs = self.encoder.run(ort::inputs! {
            "text_ids" => text_ids()?,
            "style_ttl" => tensor(ttl_shape.clone(), ttl.clone())?,
            "text_mask" => text_mask()?,
        })?;
        let (shape, values) = outputs["text_emb"].try_extract_tensor::<f32>()?;
        let embedding = (shape.to_vec(), values.to_vec());
        drop(outputs);

        let samples = (seconds.max(0.0) * self.sample_rate as f32) as usize;
        let frames = samples.div_ceil(self.frame).max(1);
        let channels = self.latent_channels;
        let mut latent: Vec<f32> = (0..channels * frames).map(|_| gaussian()).collect();
        let steps = self.steps;
        for step in 0..steps {
            let outputs = self.estimator.run(ort::inputs! {
                "noisy_latent" => tensor(vec![1, channels as i64, frames as i64], latent)?,
                "text_emb" => tensor(embedding.0.clone(), embedding.1.clone())?,
                "style_ttl" => tensor(ttl_shape.clone(), ttl.clone())?,
                "latent_mask" => tensor(vec![1, 1, frames as i64], vec![1.0f32; frames])?,
                "text_mask" => text_mask()?,
                "current_step" => tensor(vec![1], vec![step as f32])?,
                "total_step" => tensor(vec![1], vec![steps as f32])?,
            })?;
            latent = outputs["denoised_latent"]
                .try_extract_tensor::<f32>()?
                .1
                .to_vec();
        }

        let outputs = self.vocoder.run(ort::inputs! {
            "latent" => tensor(vec![1, channels as i64, frames as i64], latent)?,
        })?;
        let wav = outputs["wav_tts"].try_extract_tensor::<f32>()?.1;
        Ok(wav[..samples.min(wav.len())].to_vec())
    }
}

/// A standard normal sample (Box-Muller).
fn gaussian() -> f32 {
    let u1: f32 = rand::random::<f32>().max(f32::MIN_POSITIVE);
    let u2: f32 = rand::random();
    (-2.0 * u1.ln()).sqrt() * (std::f32::consts::TAU * u2).cos()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Runs the real model when `NOTABLES_SUPERTONIC_DIR` points at a pack
    /// folder: `cargo test --release --lib speaks -- --ignored --nocapture`.
    #[test]
    #[ignore = "needs the downloaded model pack"]
    fn speaks() {
        let folder = std::path::PathBuf::from(std::env::var("NOTABLES_SUPERTONIC_DIR").unwrap());
        let pack: Pack = serde_json::from_value(serde_json::json!({
            "id": "supertonic-3", "kind": "voice", "version": "test", "format": 1,
            "languages": ["en", "fr", "ar"], "defaultStyle": "F1", "sampleRate": 44100,
            "styles": [{ "id": "F1", "name": "Ada" }, { "id": "M1", "name": "Elias" }],
            "license": { "name": "OpenRAIL-M", "path": "LICENSE" }, "files": [],
        }))
        .unwrap();
        let started = std::time::Instant::now();
        let mut model = Model::load(&folder, &pack).unwrap();
        println!("load: {:?}", started.elapsed());
        let lines = [
            (
                "en",
                "Read aloud now sounds like a calm, real person, right on your device.",
            ),
            (
                "fr",
                "Bonjour, je lis vos notes à voix haute, sans connexion.",
            ),
            ("ar", "مرحبا، هذا صوت طبيعي على جهازك."),
        ];
        for (index, (lang, line)) in lines.iter().enumerate() {
            for speed in [1.0, 1.5] {
                let started = std::time::Instant::now();
                let audio = model.synthesize(line, lang, None, speed).unwrap();
                let seconds = audio.len() as f32 / 44100.0;
                println!(
                    "{lang} x{speed}: {:?} for {seconds:.2}s of audio",
                    started.elapsed()
                );
                assert!(seconds > 1.0);
                let peak = audio.iter().fold(0f32, |peak, s| peak.max(s.abs()));
                assert!(peak > 0.05, "silent output");
                write_wav(&folder.join(format!("out-{index}-{speed}.wav")), &audio);
            }
        }
    }

    /// Compares step counts by speed and by what Whisper hears:
    /// also set `NOTABLES_WHISPER_MODEL` to a ggml model file.
    #[test]
    #[ignore = "needs the downloaded model packs"]
    fn steps_trade_off() {
        let folder = std::path::PathBuf::from(std::env::var("NOTABLES_SUPERTONIC_DIR").unwrap());
        let whisper = std::path::PathBuf::from(std::env::var("NOTABLES_WHISPER_MODEL").unwrap());
        let pack: Pack = serde_json::from_value(serde_json::json!({
            "id": "supertonic-3", "kind": "voice", "version": "test", "format": 1,
            "languages": ["en", "fr"], "defaultStyle": "F1", "sampleRate": 44100,
            "styles": [{ "id": "F1", "name": "Ada" }],
            "license": { "name": "OpenRAIL-M", "path": "LICENSE" }, "files": [],
        }))
        .unwrap();
        let mut model = Model::load(&folder, &pack).unwrap();
        let transcriber = crate::transcription::Transcriber::default();
        let line = "The old lighthouse keeper climbed the spiral stairs every evening, \
            lit the great lamp, and watched the ships pass safely through the narrow, \
            rocky channel until the morning light returned.";
        println!("{} characters", line.chars().count());
        model.synthesize("Warm up.", "en", None, 1.0).unwrap();
        for steps in [8, 6, 5, 4, 3] {
            model.steps = steps;
            let started = std::time::Instant::now();
            let audio = model.synthesize(line, "en", None, 1.0).unwrap();
            let took = started.elapsed();
            let resampled: Vec<f32> = (0..audio.len() * 16000 / 44100)
                .map(|i| audio[i * 44100 / 16000])
                .collect();
            let heard: String = transcriber
                .transcribe(&whisper, &resampled, Some("en"))
                .unwrap()
                .into_iter()
                .map(|segment| segment.text)
                .collect();
            println!(
                "{steps} steps: {took:?} for {:.2}s: {heard}",
                audio.len() as f32 / 44100.0
            );
            write_wav(&folder.join(format!("steps-{steps}.wav")), &audio);
        }
        model.steps = STEPS;
        for speed in [0.6, 0.7, 0.8, 1.5, 1.8, 2.0] {
            let audio = model.synthesize(line, "en", None, speed).unwrap();
            let resampled: Vec<f32> = (0..audio.len() * 16000 / 44100)
                .map(|i| audio[i * 44100 / 16000])
                .collect();
            let heard: String = transcriber
                .transcribe(&whisper, &resampled, Some("en"))
                .unwrap()
                .into_iter()
                .map(|segment| segment.text)
                .collect();
            println!("x{speed}: {:.2}s: {heard}", audio.len() as f32 / 44100.0);
            write_wav(&folder.join(format!("speed-{speed}.wav")), &audio);
        }
    }

    fn write_wav(path: &Path, samples: &[f32]) {
        let data: Vec<u8> = samples
            .iter()
            .flat_map(|s| ((s.clamp(-1.0, 1.0) * 32767.0) as i16).to_le_bytes())
            .collect();
        let mut wav = Vec::new();
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&(36 + data.len() as u32).to_le_bytes());
        wav.extend_from_slice(b"WAVEfmt ");
        for value in [16u32, 1 | (1 << 16), 44100, 88200, 2 | (16 << 16)] {
            wav.extend_from_slice(&value.to_le_bytes());
        }
        wav.extend_from_slice(b"data");
        wav.extend_from_slice(&(data.len() as u32).to_le_bytes());
        wav.extend_from_slice(&data);
        std::fs::write(path, wav).unwrap();
    }
}
