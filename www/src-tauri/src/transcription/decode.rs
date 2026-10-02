//! Decodes an audio file a packet at a time into 16 kHz mono samples, the
//! format whisper.cpp expects, handing them over in windows so hours of
//! audio never sit in memory at once.

use std::fs::File;
use std::path::Path;

use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

use super::error::{Result, TranscriptionError};

pub const SAMPLE_RATE: u32 = 16_000;

/// Linear resampler that keeps its position across packets.
struct Resampler {
    step: f64,
    position: f64,
    previous: f32,
}

impl Resampler {
    fn new(source_rate: u32) -> Self {
        Self {
            step: f64::from(source_rate) / f64::from(SAMPLE_RATE),
            position: 0.0,
            previous: 0.0,
        }
    }

    fn push(&mut self, input: &[f32], output: &mut Vec<f32>) {
        // `position` is relative to the sample before `input[0]` (`previous`).
        let len = input.len() as f64;
        while self.position < len {
            let index = self.position.floor();
            let fraction = (self.position - index) as f32;
            let i = index as usize;
            let a = if i == 0 { self.previous } else { input[i - 1] };
            let b = input[i.min(input.len() - 1)];
            output.push(a + (b - a) * fraction);
            self.position += self.step;
        }
        self.position -= len;
        if let Some(last) = input.last() {
            self.previous = *last;
        }
    }
}

/// Index of the quietest 20 ms in `samples[from..]`, a good place to cut.
fn quietest_cut(samples: &[f32], from: usize) -> usize {
    let frame = (SAMPLE_RATE / 50) as usize;
    let mut best = samples.len();
    let mut best_energy = f32::MAX;
    let mut start = from;
    while start + frame <= samples.len() {
        let energy: f32 = samples[start..start + frame].iter().map(|s| s * s).sum();
        if energy < best_energy {
            best_energy = energy;
            best = start + frame / 2;
        }
        start += frame;
    }
    best
}

/// Approximate length in milliseconds, when the container says.
pub fn duration_ms(path: &Path) -> Option<u64> {
    let (format, track_id) = open(path).ok()?;
    let track = format.tracks().iter().find(|t| t.id == track_id)?;
    let frames = track.codec_params.n_frames?;
    let rate = track.codec_params.sample_rate?;
    Some(frames * 1000 / u64::from(rate))
}

fn open(path: &Path) -> Result<(Box<dyn symphonia::core::formats::FormatReader>, u32)> {
    let file = File::open(path)?;
    let stream = MediaSourceStream::new(Box::new(file), Default::default());
    let probed = symphonia::default::get_probe()
        .format(
            &Hint::new(),
            stream,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|_| TranscriptionError::UnsupportedAudio)?;
    let format = probed.format;
    let track = format
        .default_track()
        .ok_or(TranscriptionError::UnsupportedAudio)?;
    let id = track.id;
    Ok((format, id))
}

/// Decodes `path` and calls `on_window` with about `window_seconds` of
/// samples at a time (cut at a quiet moment) and the window's start in
/// samples. Stops early if `on_window` returns false.
pub fn decode_windows(
    path: &Path,
    window_seconds: u32,
    mut on_window: impl FnMut(&[f32], u64) -> Result<bool>,
) -> Result<()> {
    let (mut format, track_id) = open(path)?;
    let params = format
        .tracks()
        .iter()
        .find(|t| t.id == track_id)
        .map(|t| t.codec_params.clone())
        .ok_or(TranscriptionError::UnsupportedAudio)?;
    let mut decoder = symphonia::default::get_codecs()
        .make(&params, &DecoderOptions::default())
        .map_err(|_| TranscriptionError::UnsupportedAudio)?;
    let mut resampler = Resampler::new(params.sample_rate.unwrap_or(SAMPLE_RATE));

    let window = (window_seconds * SAMPLE_RATE) as usize;
    let search = (2 * SAMPLE_RATE) as usize;
    let mut pending: Vec<f32> = Vec::with_capacity(window + search);
    let mut started_at: u64 = 0;
    let mut mono: Vec<f32> = Vec::new();
    let mut buffer: Option<SampleBuffer<f32>> = None;

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(SymphoniaError::IoError(error))
                if error.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break;
            }
            Err(SymphoniaError::ResetRequired) => break,
            Err(_) => return Err(TranscriptionError::UnsupportedAudio),
        };
        if packet.track_id() != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            // A damaged packet is skipped, as players do.
            Err(SymphoniaError::DecodeError(_)) => continue,
            Err(_) => return Err(TranscriptionError::UnsupportedAudio),
        };
        let spec = *decoded.spec();
        let channels = spec.channels.count().max(1);
        let samples =
            buffer.get_or_insert_with(|| SampleBuffer::<f32>::new(decoded.capacity() as u64, spec));
        if samples.capacity() < decoded.capacity() * channels {
            *samples = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
        }
        samples.copy_interleaved_ref(decoded);
        mono.clear();
        mono.extend(
            samples
                .samples()
                .chunks(channels)
                .map(|frame| frame.iter().sum::<f32>() / channels as f32),
        );
        resampler.push(&mono, &mut pending);

        if pending.len() >= window + search {
            let cut = quietest_cut(&pending[..window + search], window - search);
            if !on_window(&pending[..cut], started_at)? {
                return Ok(());
            }
            started_at += cut as u64;
            pending.drain(..cut);
        }
    }
    if !pending.is_empty() {
        on_window(&pending, started_at)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resamples_to_sixteen_kilohertz() {
        let mut resampler = Resampler::new(48_000);
        let mut out = Vec::new();
        let input: Vec<f32> = (0..48_000).map(|i| i as f32 / 48_000.0).collect();
        // Fed in uneven packets, as decoders do.
        for chunk in input.chunks(1_151) {
            resampler.push(chunk, &mut out);
        }
        assert!((out.len() as i64 - 16_000).abs() <= 1, "got {}", out.len());
        // A ramp stays a ramp.
        assert!(out.windows(2).all(|w| w[1] >= w[0]));
    }

    /// A stereo 44.1 kHz WAV file of `seconds` of a quiet tone.
    fn write_wav(path: &Path, seconds: u32) {
        let rate = 44_100u32;
        let frames = rate * seconds;
        let data_len = frames * 4;
        let mut bytes = Vec::with_capacity(44 + data_len as usize);
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&2u16.to_le_bytes());
        bytes.extend_from_slice(&rate.to_le_bytes());
        bytes.extend_from_slice(&(rate * 4).to_le_bytes());
        bytes.extend_from_slice(&4u16.to_le_bytes());
        bytes.extend_from_slice(&16u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_len.to_le_bytes());
        for i in 0..frames {
            let value =
                ((i as f32 / rate as f32 * 440.0 * std::f32::consts::TAU).sin() * 8_000.0) as i16;
            bytes.extend_from_slice(&value.to_le_bytes());
            bytes.extend_from_slice(&value.to_le_bytes());
        }
        std::fs::write(path, bytes).unwrap();
    }

    #[test]
    fn decodes_files_in_windows() {
        let path = std::env::temp_dir().join("notables-decode-test.wav");
        write_wav(&path, 7);
        let mut windows = Vec::new();
        decode_windows(&path, 3, |samples, start| {
            windows.push((start, samples.len()));
            Ok(true)
        })
        .unwrap();
        let total: usize = windows.iter().map(|(_, len)| len).sum();
        assert!((total as i64 - 7 * 16_000).abs() < 50, "total {total}");
        // Windows follow on from each other.
        for pair in windows.windows(2) {
            assert_eq!(pair[0].0 + pair[0].1 as u64, pair[1].0);
        }
        assert!(windows.len() >= 2);
        assert_eq!(duration_ms(&path), Some(7_000));
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn cuts_in_the_quietest_place() {
        let mut samples = vec![0.5_f32; 16_000];
        for sample in &mut samples[8_000..8_640] {
            *sample = 0.0;
        }
        let cut = quietest_cut(&samples, 4_000);
        assert!((8_000..8_640).contains(&cut), "cut at {cut}");
    }
}
