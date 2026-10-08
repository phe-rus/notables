import { afterEach, describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  closeAudiobook,
  openAudiobook,
  useListening,
  useListeningBookId,
} from "../../../src/features/listening/store/listening-store";

function Session() {
  const session = useListening();
  const bookId = useListeningBookId();
  return <span>{`${session.bookId ?? "none"}:${bookId ?? "none"}`}</span>;
}

afterEach(closeAudiobook);

describe("listening session", () => {
  it("follows a book switch in both selectors", () => {
    openAudiobook("first");
    expect(renderToStaticMarkup(<Session />)).toBe("<span>first:first</span>");
    openAudiobook("second");
    expect(renderToStaticMarkup(<Session />)).toBe("<span>second:second</span>");
  });

  it("clears the active book when the session closes", () => {
    openAudiobook("first");
    closeAudiobook();
    expect(renderToStaticMarkup(<Session />)).toBe("<span>none:none</span>");
  });
});
