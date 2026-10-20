import { describe, expect, it } from "bun:test";
import { collectLocalMedia } from "@/lib/documents/collect-local-media";

describe("collectLocalMedia", () => {
  it("finds photos, recordings and both files of a drawing", () => {
    const document = {
      root: {
        children: [
          { type: "image", src: "media:photo-1", alt: "" },
          { type: "image", src: "media:drawing-1", scene: "media:scene-1" },
          { type: "paragraph", children: [{ type: "audio-clip", src: "media:clip-1" }] },
          { type: "image", src: "https://example.com/remote.png" },
        ],
      },
    };
    expect(collectLocalMedia(document).sort()).toEqual([
      "clip-1",
      "drawing-1",
      "photo-1",
      "scene-1",
    ]);
  });
});
