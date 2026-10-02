import { describe, expect, it } from "bun:test";
import { comicInfoHint, spineIsRtl } from "../../../src/features/imports/importers/kind-hints";
import {
  buildImportPlan,
  type ContentHint,
  type ImportFile,
  withContentHints,
  withSeriesKind,
} from "../../../src/features/imports/lib/import-plan";
import {
  type LibrarySnapshot,
  seriesMatchKey,
} from "../../../src/features/imports/lib/import-targets";
import { partFolder } from "../../../src/features/imports/lib/part-names";

const file = (path: string): ImportFile => ({
  path,
  name: path.split("/").pop() ?? path,
  type: "",
  size: 1,
});

const hint = (kind: ContentHint["kind"]): ContentHint => ({ kind, parts: [] });

const library = (fields: Partial<LibrarySnapshot> = {}): LibrarySnapshot => ({
  series: [],
  franchises: [],
  ...fields,
});

describe("kind hints", () => {
  it("reads ComicInfo.xml Manga values", () => {
    expect(comicInfoHint("<ComicInfo><Manga>YesAndRightToLeft</Manga></ComicInfo>")).toBe("manga");
    expect(comicInfoHint("<ComicInfo><Manga>No</Manga></ComicInfo>")).toBe("comic");
    expect(comicInfoHint("<ComicInfo><Manga>Yes</Manga></ComicInfo>")).toBeNull();
    expect(comicInfoHint("<ComicInfo><Manga>Unknown</Manga>")).toBeNull();
    expect(comicInfoHint("not xml")).toBeNull();
  });

  it("reads an EPUB spine's direction", () => {
    expect(spineIsRtl('<package><spine page-progression-direction="rtl" toc="ncx">')).toBe(true);
    expect(spineIsRtl('<opf:spine page-progression-direction="ltr">')).toBe(false);
    expect(spineIsRtl("<spine>")).toBe(false);
  });
});

describe("import kinds", () => {
  it("fixes e-books, PDFs and audio, and guesses manga for pages with no hint", () => {
    const plan = buildImportPlan([
      file("Essays.epub"),
      file("Report.pdf"),
      file("Talks/01 Intro.mp3"),
      file("Pip Vol 1.cbz"),
    ]);
    const kinds = Object.fromEntries(plan.series.map((entry) => [entry.title, entry.kind]));
    expect(kinds).toEqual({ Essays: "book", Report: "book", Talks: "audiobook", Pip: "manga" });
  });

  it("lets the hint most volumes carry win, and the folder name hint at manga", () => {
    const plan = buildImportPlan([
      file("Pip Vol 1.cbz"),
      file("Pip Vol 2.cbz"),
      file("Pip Vol 3.cbz"),
    ]);
    const hinted = withContentHints(
      plan,
      new Map([
        ["Pip Vol 1.cbz", hint("comic")],
        ["Pip Vol 2.cbz", hint("comic")],
        ["Pip Vol 3.cbz", hint("manga")],
      ]),
      library(),
    );
    expect(hinted.series[0]?.kind).toBe("comic");
    const folder = buildImportPlan([file("My Manga Shelf/Pip Vol 1.cbz")]);
    expect(folder.series[0]?.kind).toBe("manga");
  });

  it("keeps the kind someone picked", () => {
    const plan = withSeriesKind(
      buildImportPlan([file("Pip Vol 1.cbz")]),
      "pip",
      "comic",
      library(),
    );
    const later = withContentHints(plan, new Map([["Pip Vol 1.cbz", hint("manga")]]), library());
    expect(later.series[0]?.kind).toBe("comic");
  });
});

describe("import merges", () => {
  const onePiece = {
    id: "s1",
    title: "One Piece",
    kind: "manga" as const,
    franchiseId: "f1",
    updatedAt: 1,
    volumes: [1, 2, 3, 4],
  };

  it("matches titles whatever their case, accents and punctuation", () => {
    expect(seriesMatchKey("Pokémon:  Adventures!")).toBe(seriesMatchKey("pokemon adventures"));
  });

  it("adds only the volumes a series lacks and lists the rest as skipped", () => {
    const plan = buildImportPlan(
      [file("One Piece Vol 3.cbz"), file("One Piece Vol 4.cbz"), file("One Piece Vol 5.cbz")],
      library({ series: [onePiece], franchises: [{ id: "f1", title: "One Piece" }] }),
    );
    expect(plan.series[0]).toMatchObject({
      mergeInto: { id: "s1", title: "One Piece" },
      merge: true,
      skippedVolumes: [3, 4],
      addedVolumes: [5],
    });
  });

  it("offers the franchise when the kind differs, and never merges across kinds", () => {
    const plan = buildImportPlan(
      [file("One Piece/01 Romance Dawn.mp3")],
      library({ series: [onePiece], franchises: [{ id: "f1", title: "One Piece" }] }),
    );
    expect(plan.series[0]).toMatchObject({
      kind: "audiobook",
      mergeInto: null,
      franchise: { id: "f1", title: "One Piece" },
      joinFranchise: true,
    });
  });

  it("combines planned series with the same kind and title", () => {
    const plan = buildImportPlan([
      file("One Piece/Vol 1/001/1.png"),
      file("one piece!/Vol 2/001/1.png"),
    ]);
    expect(plan.series).toHaveLength(1);
    expect(plan.series[0]?.books.map((book) => book.volume)).toEqual([1, 2]);
  });
});

describe("audio parts", () => {
  it("reads Part folders by number or word, one to twenty", () => {
    expect(partFolder("Part 3")).toEqual({ title: "Part 3", order: 3 });
    expect(partFolder("part three")).toEqual({ title: "part three", order: 3 });
    expect(partFolder("Part Twenty")).toMatchObject({ order: 20 });
    expect(partFolder("Part Twentyone")).toBeNull();
    expect(partFolder("Party 3")).toBeNull();
  });

  it("imports tracks in Part folders as parts of one book", () => {
    const plan = buildImportPlan([
      file("Narnia/Part 2/01 Return.mp3"),
      file("Narnia/Part 1/01 Wardrobe.mp3"),
      file("Narnia/Part 1/02 Lamp.mp3"),
    ]);
    expect(plan.series).toHaveLength(1);
    const book = plan.series[0]?.books[0];
    expect(plan.series[0]?.books).toHaveLength(1);
    expect(book?.chapters.map((chapter) => chapter.title)).toEqual(["Wardrobe", "Lamp", "Return"]);
    expect(book?.parts).toEqual([
      { title: "Part 1", firstChapter: 0 },
      { title: "Part 2", firstChapter: 2 },
    ]);
  });
});
