/** Sample rate whisper.cpp expects. */
export const SPEECH_SAMPLE_RATE = 16_000;

/**
 * Decodes a recording (any format the WebView can play) to mono samples
 * at 16 kHz, mixing channels down and resampling as needed.
 */
export async function decodeForSpeech(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const length = Math.ceil(decoded.duration * SPEECH_SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, Math.max(1, length), SPEECH_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    void context.close();
  }
}
