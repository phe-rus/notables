import { CheckIcon, cn, ScanCodeIcon, WarningIcon } from "@ultrapeach/ui";
import { useCallback, useEffect, useState } from "react";
import { readHiddenMark } from "../hidden-mark/reveal-hidden-mark";
import { type FrameReader, imageCanvas, QrScanner } from "./qr-scanner";

/** How long the camera looks for the hidden mark before giving up. */
const LOOK_FOR_MS = 12_000;

export type MarkSource = { kind: "camera" } | { kind: "photo"; file: Blob } | { kind: "none" };
type MarkState = "checking" | "match" | "mismatch" | "missing" | "unavailable" | "not-scanned";

const readFrame: FrameReader = (canvas) => {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return context ? readHiddenMark(context.getImageData(0, 0, canvas.width, canvas.height)) : null;
};

/**
 * The second check on a paper copy: the faint mark printed across it. A
 * genuine printout or PDF carries one that matches its seal; a copy that
 * was retyped, regenerated or edited, by hand or by AI, loses it.
 */
export function HiddenMarkCheck({ expected, source }: { expected: string; source: MarkSource }) {
  const [state, setState] = useState<MarkState>(
    source.kind === "none" ? "not-scanned" : "checking",
  );

  const settle = useCallback(
    (found: string | null) =>
      setState(found === null ? "missing" : found === expected ? "match" : "mismatch"),
    [expected],
  );

  useEffect(() => {
    if (source.kind !== "photo") return;
    let cancelled = false;
    void imageCanvas(source.file, 2400)
      .then((canvas) => readFrame(canvas))
      .then((found) => !cancelled && settle(found ?? null))
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [source, settle]);

  useEffect(() => {
    if (source.kind !== "camera" || state !== "checking") return;
    const timer = setTimeout(() => setState("missing"), LOOK_FOR_MS);
    return () => clearTimeout(timer);
  }, [source.kind, state]);

  const onUnavailable = useCallback(() => setState("unavailable"), []);

  const copy: Record<MarkState, { title: string; body: string; tone: "good" | "bad" | "neutral" }> =
    {
      checking: {
        title: "Looking for the hidden mark…",
        body: "Hold the whole page in view, flat and well lit.",
        tone: "neutral",
      },
      match: {
        title: "Hidden mark matches",
        body: "This is a true print or PDF of the signed document, not a retyped or regenerated copy.",
        tone: "good",
      },
      mismatch: {
        title: "Hidden mark belongs to another document",
        body: "The page was assembled from parts of different documents. Treat it as fake.",
        tone: "bad",
      },
      missing: {
        title: "No hidden mark found",
        body: "A genuine print carries a faint mark a camera can see. This copy may have been retyped, regenerated or edited, or the photo is too dark or blurry. Try again in good light.",
        tone: "bad",
      },
      unavailable: {
        title: "Couldn’t look for the hidden mark",
        body: "The camera isn’t available. Choose a clear photo of the whole page instead.",
        tone: "neutral",
      },
      "not-scanned": {
        title: "Hidden mark not checked",
        body: "Scan the paper with a phone camera to also check the faint mark printed across it.",
        tone: "neutral",
      },
    };
  const { title, body, tone } = copy[state];

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className={cn(
          "flex gap-3 rounded-4xl p-4 text-left",
          tone === "good" ? "bg-success/10" : tone === "bad" ? "bg-danger/10" : "bg-fill/60",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white",
            tone === "good" ? "bg-success" : tone === "bad" ? "bg-danger" : "bg-label-tertiary",
          )}
        >
          {tone === "good" ? (
            <CheckIcon size={16} strokeWidth={3} />
          ) : tone === "bad" ? (
            <WarningIcon size={15} strokeWidth={2.4} />
          ) : (
            <ScanCodeIcon size={15} />
          )}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-subheadline font-semibold">{title}</span>
          <span className="text-footnote leading-snug text-label-secondary">{body}</span>
        </span>
      </div>
      {source.kind === "camera" && state === "checking" && (
        <QrScanner
          read={readFrame}
          onScan={settle}
          onUnavailable={onUnavailable}
          hint="Fit the whole page in the frame"
        />
      )}
      {source.kind === "camera" && (state === "missing" || state === "unavailable") && (
        <button
          type="button"
          onClick={() => setState("checking")}
          className="self-center rounded-full bg-fill px-4 py-2 text-subheadline font-semibold"
        >
          Look again
        </button>
      )}
    </div>
  );
}
