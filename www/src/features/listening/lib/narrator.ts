import type { SpeechEngine } from "./speech-engines";

export interface NarratorState {
  index: number;
  playing: boolean;
  total: number;
  error: string | null;
}

/**
 * Reads lines one after another with a speech engine, preparing the next
 * while the current one plays. Pausing stops mid-line; playing again
 * starts that line over, which every engine supports.
 */
export class Narrator {
  #state: NarratorState;
  #listeners = new Set<(state: NarratorState) => void>();
  #run = 0;

  constructor(
    private readonly lines: string[],
    private engine: SpeechEngine,
    private options: { rate: number; lang: string },
    start = 0,
  ) {
    this.#state = {
      index: Math.max(0, Math.min(start, lines.length - 1)),
      playing: false,
      total: lines.length,
      error: null,
    };
  }

  get state() {
    return this.#state;
  }

  subscribe(listener: (state: NarratorState) => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #set(change: Partial<NarratorState>) {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) listener(this.#state);
  }

  async play() {
    if (this.#state.playing || this.lines.length === 0) return;
    const run = ++this.#run;
    this.#set({ playing: true, error: null });
    while (run === this.#run && this.#state.index < this.lines.length) {
      const line = this.lines[this.#state.index] ?? "";
      const next = this.lines[this.#state.index + 1];
      if (next) this.engine.prepare?.(next);
      try {
        await this.engine.speak(line, this.options);
      } catch (error) {
        if (run !== this.#run) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        this.#set({
          playing: false,
          error: error instanceof Error ? error.message : "Speech stopped.",
        });
        return;
      }
      if (run !== this.#run) return;
      if (this.#state.index + 1 >= this.lines.length) break;
      this.#set({ index: this.#state.index + 1 });
    }
    if (run === this.#run) this.#set({ playing: false });
  }

  pause() {
    this.#run += 1;
    this.engine.cancel();
    this.#set({ playing: false });
  }

  toggle() {
    if (this.#state.playing) this.pause();
    else void this.play();
  }

  /** Jumps to a line, carrying on if already playing. */
  seek(index: number) {
    const wasPlaying = this.#state.playing;
    this.pause();
    this.#set({ index: Math.max(0, Math.min(index, this.lines.length - 1)) });
    if (wasPlaying) void this.play();
  }

  /** Changes voice or pace from the current line. */
  reconfigure(engine: SpeechEngine, options: { rate: number; lang: string }) {
    const wasPlaying = this.#state.playing;
    this.pause();
    this.engine = engine;
    this.options = options;
    if (wasPlaying) void this.play();
  }

  stop() {
    this.pause();
    this.#listeners.clear();
  }
}
