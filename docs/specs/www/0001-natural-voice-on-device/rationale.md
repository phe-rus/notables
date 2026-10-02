# 0001. Natural voice on the device: rationale

## Context

Read aloud today has two engines. Device voices (the Web Speech API) are free and offline, but they vary by platform and are plainly robotic on Linux, where WebKitGTK exposes espeak voices. Gemini voices sound natural, but they need the person's own paid key and a connection. The product promise (local first, Apple like, private) needs a voice in between: natural, offline, free, and identical everywhere.

The app ships from one codebase to Windows, macOS, Linux, Android, iOS and the web (Cloudflare Workers). App text comes in six languages: English, French, Spanish, Portuguese, Swahili and Arabic. Anything that runs on device must work in the Rust core on five native targets, and must not rule out a browser runtime later. Notables already downloads a large model once (Whisper `ggml-base.bin`, about 142 MB) from Hugging Face into app data, through a temporary file and a rename.

Licensing is a real constraint. Most small open voice models turn text into phonemes with espeak-ng, which is GPL-3; shipping it inside the app would pull GPL obligations into Notables. Model weights also carry their own licenses, some non-commercial.

The owner wants everything served from one domain, `notables.pherus.org`, with model files in the project's R2 bucket, and no paid service involved. Phones must not burn mobile data on a download of a hundred megabytes or more.

## Options considered

### Option 1: Supertonic 3 in the Rust core with ONNX Runtime

Supertone's open model, about 99M parameters, 31 languages including en, fr, es, pt and ar (not Swahili). It reads characters directly, with no espeak-ng. Weights are OpenRAIL-M, sample code MIT. It runs on ONNX Runtime, through the `ort` crate in Rust.

**Pros**:
- One model and one runtime for five of the six languages.
- No GPL dependency.
- Built for fast on device and browser inference; the same files serve a future web runtime.

**Cons**:
- No Swahili.
- Heavier than Piper or Kokoro at full precision.
- OpenRAIL-M carries use restrictions, and it is a newer project with a shorter track record.

### Option 2: Kokoro 82M

A widely praised small model, Apache 2.0, very warm in English, with ONNX builds and a browser package.

**Pros**:
- Excellent English quality and a permissive license.
- Large community and browser examples.

**Cons**:
- No Arabic, no Swahili.
- Languages other than English depend on espeak-ng (GPL) for phonemes.

### Option 3: Piper voices (through sherpa-onnx or Piper's own runtime)

Small per language VITS voices covering all six languages, including `sw_CD` and `ar_JO`.

**Pros**:
- Covers Swahili and Arabic.
- Small files, very fast, proven on Raspberry Pi class hardware.

**Cons**:
- Clearly less natural, short of the premium feel the feature exists for.
- The project moved to GPL-3 (`piper1-gpl`), it needs espeak-ng, and each voice has its own license to check.

### Option 4: onnxruntime-web inside the WebView on every platform

Run whichever model in JavaScript, in the WebView, everywhere.

**Pros**:
- One code path, identical to the future web build.

**Cons**:
- Slower and more memory hungry, worst in iOS WKWebView and Linux WebKitGTK (no WebGPU), which puts the one second start at risk.
- Model memory sits in the WebView, next to the editor.

## Rationale

The force that decides it is quality without licensing debt across the languages people actually use. Supertonic is the only candidate that covers five of the six app languages with one model, sounds natural, and needs no espeak-ng (basis: Supertonic 3 model card). Kokoro sounds as good in English but drops Arabic and brings GPL phonemes for everything else. Piper solves Swahili but fails the reason the feature exists: it does not sound premium, and its GPL move makes it a legal question for every release (basis: piper1-gpl repository).

Swahili goes to device voices rather than a second engine. Adding Piper only for Swahili would bring a second runtime and GPL code for one language. Meta's MMS Swahili is licensed for noncommercial use only, which conflicts with an app that issues invoices. Keeping the engine list open means a good Swahili model can be added later as another pack, with no redesign.

Running natively in Rust mirrors what already works for Whisper and the audiobook decoder: heavy models and audio stay out of WebView memory (basis: `src-tauri/src/transcription`). Serving from the existing Worker honours the one domain rule. Versioned, immutable paths plus a short lived manifest make long client caching and updates safe (basis: immutable asset versioning). Checksums in the manifest make resumed and cached downloads trustworthy (basis: content integrity by SHA-256 digest).

## References

**Project sources**:
- `www/src/features/listening/lib/speech-engines.ts` and `voices.ts`: the `SpeechEngine` seam and voice ranking
- `www/src-tauri/src/transcription/model.rs`: the existing one time model download
- `www/src/routes/media/$publicationId/$mediaId.ts`: R2 range reads through the Worker
- `docs/scope/www/scope.md`, Slice 1, feature 2

**Practices & standards**:
- Immutable asset versioning with a short lived manifest
- Content integrity by SHA-256 digest
- HTTP range requests (RFC 9110) for resumable downloads

**Links** (web verified during the design conversation):
- Supertonic 3 model card: https://huggingface.co/Supertone/supertonic-3
- Piper voices list: https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md
- Piper (GPL-3): https://github.com/OHF-Voice/piper1-gpl
- Kokoro 82M ONNX: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- sherpa-onnx: https://github.com/k2-fsa/sherpa-onnx
