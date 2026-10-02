import { describe, expect, it } from "bun:test";
import { Narrator } from "../../../src/features/listening/lib/narrator";
import {
  normalizePeak,
  type SpeechEngine,
} from "../../../src/features/listening/lib/speech-engines";
import { fromSystem, rankVoices, type Voice } from "../../../src/features/listening/lib/voices";
import { phraseAt, type TimedPhrase } from "../../../src/features/listening/store/transcript-store";

/** Speaks instantly, remembering what it said. */
function fakeEngine() {
  const said: string[] = [];
  let stop: (() => void) | null = null;
  const engine: SpeechEngine = {
    speak: (text) =>
      new Promise((resolve, reject) => {
        said.push(text);
        stop = () => reject(new DOMException("stopped", "AbortError"));
        setTimeout(resolve, 1);
      }),
    cancel: () => stop?.(),
  };
  return { engine, said };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

describe("narrator", () => {
  it("reads every line in order from where it starts", async () => {
    const { engine, said } = fakeEngine();
    const narrator = new Narrator(["One.", "Two.", "Three."], engine, { rate: 1, lang: "en" }, 1);
    await narrator.play();
    expect(said).toEqual(["Two.", "Three."]);
    expect(narrator.state).toMatchObject({ index: 2, playing: false });
  });

  it("jumps to a line and carries on", async () => {
    const { engine, said } = fakeEngine();
    const narrator = new Narrator(["A.", "B.", "C.", "D."], engine, { rate: 1, lang: "en" });
    void narrator.play();
    narrator.seek(3);
    await settle();
    expect(said.at(-1)).toBe("D.");
    expect(narrator.state.index).toBe(3);
  });
});

describe("read-along", () => {
  const phrases: TimedPhrase[] = [
    [0, 900, "It was late."],
    [1000, 2500, "The river was high."],
    [2600, 4000, "Nobody slept."],
  ];
  it("finds the phrase being spoken", () => {
    expect(phraseAt(phrases, 0)).toBe(0);
    expect(phraseAt(phrases, 1800)).toBe(1);
    expect(phraseAt(phrases, 2550)).toBe(1);
    expect(phraseAt(phrases, 9000)).toBe(2);
    expect(phraseAt([], 100)).toBe(-1);
  });
});

describe("voices", () => {
  const voice = (id: string, lang: string, natural: boolean, offline = true): Voice => ({
    id,
    provider: "system",
    name: id,
    lang,
    natural,
    offline,
  });
  it("puts natural voices in the right language first", () => {
    const ranked = rankVoices(
      [
        voice("plain-us", "en-US", false),
        voice("natural-gb", "en-GB", true, false),
        voice("natural-us", "en-US", true),
        voice("french", "fr-FR", true),
      ],
      "en-US",
    );
    expect(ranked.map((v) => v.id)).toEqual(["natural-us", "natural-gb", "plain-us"]);
  });
});

describe("voice loudness", () => {
  it("raises quiet speech to full scale", () => {
    const channel = new Float32Array([0.1, -0.25, 0.05]);
    normalizePeak(channel);
    expect(Math.max(...channel.map(Math.abs))).toBeCloseTo(0.98);
    expect(channel[0]).toBeCloseTo(0.392);
  });

  it("leaves silence and loud speech alone", () => {
    const silent = new Float32Array([0, 0]);
    normalizePeak(silent);
    expect([...silent]).toEqual([0, 0]);
    const loud = new Float32Array([0.99, -0.5]);
    normalizePeak(loud);
    expect(loud[0]).toBeCloseTo(0.99);
  });
});

describe("device voices", () => {
  const voice = (name: string, lang: string, voiceURI = "") =>
    ({ name, lang, voiceURI, localService: true, default: false }) as SpeechSynthesisVoice;

  it("names voices uniquely when the system leaves their URI empty", () => {
    const ids = [voice("English", "en-US"), voice("English", "en-GB")].map((v) => fromSystem(v).id);
    expect(new Set(ids).size).toBe(2);
  });

  it("lists each voice once", () => {
    const twice = [voice("Alex", "en-US", "alex"), voice("Alex", "en-US", "alex")].map(fromSystem);
    expect(rankVoices(twice, "en-US")).toHaveLength(1);
  });
});
