import { localMediaSrc } from "@notables/core";
import { Button, MicIcon } from "@notables/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { saveMedia } from "../../../../platform/storage/media-store";
import { getLibrary } from "../../../library/store/library-store";
import {
  type FinishedRecording,
  RecorderSheet,
} from "../../../recording/components/recorder-sheet";
import { type BookEntry, getBookStore } from "../../store/book-store";
import { queueNarration } from "../lib/pending-narrations";
import { transcriptParagraphs } from "../lib/transcript-paragraphs";

/**
 * Tell a chapter out loud: records, then creates the next chapter with the
 * recording and its transcript as paragraphs, and opens it for editing.
 */
export function NarrateChapterButton({ book }: { book: BookEntry }) {
  const [recording, setRecording] = useState(false);
  const navigate = useNavigate();
  const chapterNumber = book.chapterIds.length + 1;

  const finish = async ({ blob, durationMs, segments }: FinishedRecording) => {
    const mediaId = await saveMedia(blob);
    const note = getLibrary().create("story");
    getBookStore().addChapter(book.id, note.id);
    queueNarration(note.id, {
      title: `Chapter ${chapterNumber}`,
      audioClip: {
        src: localMediaSrc(mediaId),
        durationMs,
        transcript: segments.map((segment) => segment.text).join(" "),
      },
      paragraphs: transcriptParagraphs(segments),
    });
    setRecording(false);
    void navigate({ to: "/notes/$noteId", params: { noteId: note.id }, search: { view: "story" } });
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setRecording(true)} title="Narrate a new chapter">
        <MicIcon size={16} />
        Narrate
      </Button>
      <RecorderSheet
        open={recording}
        title={`${book.title || "Untitled book"} · Chapter ${chapterNumber}`}
        onCancel={() => setRecording(false)}
        onFinish={finish}
      />
    </>
  );
}
