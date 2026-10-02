import { localMediaSrc } from "@notables/core";
import { useEditorCommands } from "@notables/editor";
import { saveMedia } from "../../../platform/storage/media-store";
import { type FinishedRecording, RecorderSheet } from "./recorder-sheet";

/**
 * Records into the open note: the audio is stored on the device and an
 * audio clip with its transcript is inserted at the caret.
 */
export function NoteRecorder({
  open,
  title,
  onClose,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
}) {
  const { insertAudioClip, focus } = useEditorCommands();

  const finish = async ({ blob, durationMs, segments }: FinishedRecording) => {
    const mediaId = await saveMedia(blob);
    insertAudioClip({
      src: localMediaSrc(mediaId),
      durationMs,
      transcript: segments.map((segment) => segment.text).join(" "),
    });
    onClose();
    focus();
  };

  return (
    <RecorderSheet
      open={open}
      title={title || "New recording"}
      onCancel={onClose}
      onFinish={finish}
    />
  );
}
