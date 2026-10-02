use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use super::error::{Result, TranscriptionError};

/// A transcribed phrase, timed in milliseconds from the start of the audio.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    pub start_ms: i64,
    pub end_ms: i64,
    pub text: String,
}

/// Keeps the loaded model between transcriptions; loading takes seconds.
#[derive(Default)]
pub struct Transcriber {
    loaded: Mutex<Option<(PathBuf, WhisperContext)>>,
}

impl Transcriber {
    /// Transcribes 16 kHz mono samples. Blocking: run on a worker thread.
    pub fn transcribe(
        &self,
        model: &Path,
        samples: &[f32],
        language: Option<&str>,
    ) -> Result<Vec<Segment>> {
        let mut loaded = self
            .loaded
            .lock()
            .map_err(|_| TranscriptionError::Interrupted)?;
        if loaded.as_ref().map(|(path, _)| path.as_path()) != Some(model) {
            let context =
                WhisperContext::new_with_params(model, WhisperContextParameters::default())?;
            *loaded = Some((model.to_path_buf(), context));
        }
        let (_, context) = loaded.as_ref().ok_or(TranscriptionError::ModelMissing)?;

        let mut state = context.create_state()?;
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some(language.unwrap_or("auto")));
        params.set_n_threads(worker_threads());
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_suppress_blank(true);
        state.full(params, samples)?;

        let raw = (0..state.full_n_segments())
            .filter_map(|index| state.get_segment(index))
            .map(|segment| {
                let text = segment
                    .to_str_lossy()
                    .map(|text| text.into_owned())
                    .unwrap_or_default();
                (segment.start_timestamp(), segment.end_timestamp(), text)
            });
        Ok(normalize_segments(raw))
    }
}

fn worker_threads() -> i32 {
    std::thread::available_parallelism()
        .map(|n| n.get().clamp(1, 8) as i32)
        .unwrap_or(4)
}

/// Converts whisper's centisecond timings to milliseconds and drops empty
/// or non-speech segments such as "[BLANK_AUDIO]".
pub fn normalize_segments(raw: impl IntoIterator<Item = (i64, i64, String)>) -> Vec<Segment> {
    raw.into_iter()
        .filter_map(|(start, end, text)| {
            let text = text.trim();
            let is_marker = text.starts_with('[') && text.ends_with(']');
            (!text.is_empty() && !is_marker).then(|| Segment {
                start_ms: start * 10,
                end_ms: end * 10,
                text: text.to_string(),
            })
        })
        .collect()
}

/// Reads little-endian 32-bit float samples sent by the WebView.
pub fn samples_from_bytes(bytes: &[u8]) -> Result<Vec<f32>> {
    let (samples, rest) = bytes.as_chunks::<4>();
    if !rest.is_empty() {
        return Err(TranscriptionError::InvalidAudio);
    }
    Ok(samples.iter().copied().map(f32::from_le_bytes).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_timings_and_drops_markers() {
        let segments = normalize_segments([
            (0, 150, " We walked to the market. ".to_string()),
            (150, 300, "[BLANK_AUDIO]".to_string()),
            (300, 420, "   ".to_string()),
            (
                420,
                610,
                " The mangoes were stacked like little suns.".to_string(),
            ),
        ]);
        assert_eq!(
            segments,
            vec![
                Segment {
                    start_ms: 0,
                    end_ms: 1500,
                    text: "We walked to the market.".into()
                },
                Segment {
                    start_ms: 4200,
                    end_ms: 6100,
                    text: "The mangoes were stacked like little suns.".into()
                },
            ]
        );
    }

    #[test]
    fn reads_little_endian_samples() {
        let bytes: Vec<u8> = [0.5f32, -1.0]
            .iter()
            .flat_map(|s| s.to_le_bytes())
            .collect();
        assert_eq!(samples_from_bytes(&bytes).unwrap(), vec![0.5, -1.0]);
        assert!(samples_from_bytes(&[0, 1, 2]).is_err());
    }
}
