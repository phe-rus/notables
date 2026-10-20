import { describe, expect, it } from "bun:test";
import { storyStart } from "@/features/listening/lib/narration-script";
import { Narrator } from "@/features/listening/lib/narrator";
import { normalizePeak, type SpeechEngine } from "@/features/listening/lib/speech-engines";
import { geminiVoices, naturalVoices, rankVoices } from "@/features/listening/lib/voices";
import { phraseAt, type TimedPhrase } from "@/features/listening/store/transcript-store";

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

describe("natural voice", () => {
  const info = {
    version: "2026.10.1",
    languages: ["en", "fr", "ar"],
    styles: [
      { id: "F1", name: "Ada" },
      { id: "F2", name: "Lina" },
    ],
    defaultStyle: "F2",
    sampleRate: 44_100,
  };
  it("leads with its default style, ahead of Gemini's voices", () => {
    const ranked = rankVoices(
      [...geminiVoices, ...naturalVoices(info, "en-US", (id) => id)],
      "en-US",
    );
    expect(ranked.slice(0, 2).map((v) => v.id)).toEqual(["device-neural:F2", "device-neural:F1"]);
    expect(ranked[0]?.name).toBe("Lina · F2");
    expect(ranked[2]?.provider).toBe("gemini");
  });

  it("lists each voice once", () => {
    const styles = naturalVoices(info, "en", (id) => id);
    expect(rankVoices([...styles, ...styles], "en")).toHaveLength(2);
  });

  it("leaves only Gemini's voices for a language the pack does not speak", () => {
    const ranked = rankVoices([...geminiVoices, ...naturalVoices(info, "sw", (id) => id)], "sw");
    expect(ranked.every((v) => v.provider === "gemini")).toBe(true);
  });

  it("is not offered for languages the pack does not speak", () => {
    expect(naturalVoices(info, "sw", (id) => id)).toEqual([]);
    expect(naturalVoices(null, "en", (id) => id)).toEqual([]);
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

describe("storyStart", () => {
  it("skips a contents list to where its first chapter begins", () => {
    const lines = [
      "The Paper Harbour",
      "Contents",
      "Chapter 1 Low Tide ........ 3",
      "Chapter 2 The Lantern ...... 17",
      "Chapter 1 Low Tide",
      "The boats were late again that morning.",
    ];
    expect(storyStart(lines)).toBe(4);
  });

  it("starts at the beginning when there is no contents list", () => {
    expect(storyStart(["Chapter 1", "It rained."])).toBe(0);
  });
});
