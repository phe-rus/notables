import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, type NodeKey } from "lexical";
import { useState } from "react";
import { useTranscriptionService } from "../../media/transcription-service";
import { $isAudioClipNode } from "./audio-clip-node";
import { AudioClip } from "./audio-clip-player";

/**
 * An audio clip inside the editor. Clips without a transcript offer to
 * transcribe when the app provides a transcription service.
 */
export function AudioClipBlock({
  nodeKey,
  src,
  durationMs,
  transcript,
}: {
  nodeKey: NodeKey;
  src: string;
  durationMs: number;
  transcript: string;
}) {
  const [editor] = useLexicalComposerContext();
  const service = useTranscriptionService();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcribe = async () => {
    if (!service) return;
    setError(null);
    setStatus("Preparing…");
    try {
      const text = await service.transcribe(src, setStatus);
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isAudioClipNode(node)) node.setTranscript(text);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setStatus(null);
    }
  };

  const action =
    !transcript && service ? (
      <div className="nt-audio-action">
        <button type="button" disabled={status !== null} onClick={transcribe}>
          {status ?? "Transcribe on this device"}
        </button>
        {error && <span role="alert">{error}</span>}
      </div>
    ) : null;

  return <AudioClip src={src} durationMs={durationMs} transcript={transcript} action={action} />;
}
