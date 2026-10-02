/**
 * The model packs Notables publishes to R2 (spec 0001). Each pack copies
 * pinned upstream files into `models/<id>/<version>/`. Changing any file
 * means a new `version`; changing how the app must load it means a new
 * `format` (and app code that supports it).
 */

export interface PackFile {
  /** Path in the upstream repository, at the pinned revision. */
  from: string;
  /** Path inside the pack folder. */
  to: string;
}

export interface PackSource {
  id: string;
  kind: "voice" | "transcription";
  version: string;
  format: number;
  /** A Hugging Face model repository, pinned to a commit. */
  upstream: { repo: string; revision: string };
  files: PackFile[];
  license: {
    name: string;
    /** Path inside the pack folder. */
    path: string;
    /** A license file kept in this repository, when upstream has none. */
    local?: string;
  };
  voice?: {
    languages: string[];
    styles: { id: string; name: string }[];
    defaultStyle: string;
    sampleRate: number;
  };
}

/** The languages Supertonic 3 speaks (ISO 639-1). */
const SUPERTONIC_LANGUAGES =
  "en ko ja ar bg cs da de el es et fi fr hi hr hu id it lt lv nl pl pt ro ru sk sl sv tr uk vi".split(
    " ",
  );

/** Supertonic voice styles; each gets a proper name that is never translated. */
const supertonicStyles = [
  { id: "F1", name: "Ada" },
  { id: "F2", name: "Lina" },
  { id: "F3", name: "Mira" },
  { id: "F4", name: "Noor" },
  { id: "F5", name: "Sofia" },
  { id: "M1", name: "Elias" },
  { id: "M2", name: "Omar" },
  { id: "M3", name: "Theo" },
  { id: "M4", name: "Kai" },
  { id: "M5", name: "Luca" },
];

export const PACKS: PackSource[] = [
  {
    id: "supertonic-3",
    kind: "voice",
    version: "2026.10.1",
    format: 1,
    // Supertone moved its open models to this archive namespace.
    upstream: {
      repo: "supertone-oss-archive/supertonic-3",
      revision: "aafc6e32416a594460b32413efc49d7fe4ce6d46",
    },
    files: [
      ...["duration_predictor", "text_encoder", "vector_estimator", "vocoder"].map((graph) => ({
        from: `onnx/${graph}.onnx`,
        to: `onnx/${graph}.onnx`,
      })),
      { from: "onnx/tts.json", to: "onnx/tts.json" },
      { from: "onnx/unicode_indexer.json", to: "onnx/unicode_indexer.json" },
      ...supertonicStyles.map(({ id }) => ({
        from: `voice_styles/${id}.json`,
        to: `voice_styles/${id}.json`,
      })),
      { from: "LICENSE", to: "LICENSE" },
    ],
    license: { name: "OpenRAIL-M", path: "LICENSE" },
    voice: {
      languages: SUPERTONIC_LANGUAGES,
      styles: supertonicStyles,
      defaultStyle: "F1",
      sampleRate: 44100,
    },
  },
  {
    id: "whisper-base",
    kind: "transcription",
    version: "2026.10.1",
    format: 1,
    upstream: {
      repo: "ggerganov/whisper.cpp",
      revision: "5359861c739e955e79d9a303bcbc70fb988958b1",
    },
    files: [{ from: "ggml-base.bin", to: "ggml-base.bin" }],
    license: { name: "MIT", path: "LICENSE", local: "licenses/whisper-LICENSE" },
  },
];
