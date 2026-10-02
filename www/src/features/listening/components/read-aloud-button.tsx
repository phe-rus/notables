import { cn, HeadphonesIcon, IconButton, toast } from "@notables/ui";
import { AnimatePresence } from "motion/react";
import { type RefObject, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { buildScript, type ScriptLine } from "../lib/narration-script";
import { clearReading, paintReading, rangesForLine } from "../lib/reading-highlight";
import { useNarration } from "../lib/use-narration";
import { NarrationBar } from "./narration-bar";

/**
 * Reads the text under `root` aloud from the top, lighting up each
 * sentence as it's read. For notes and other single documents.
 */
export function ReadAloudButton({
  root,
  title,
  className,
}: {
  root: RefObject<HTMLElement | null>;
  title: string;
  className?: string;
}) {
  const lang = document.documentElement.lang || navigator.language || "en";
  const narration = useNarration(lang, title || "Note");
  const script = useRef<ScriptLine[]>([]);
  const index = narration.state?.index ?? -1;

  useEffect(() => {
    const line = script.current[index];
    const element = root.current;
    if (!line || !element) {
      clearReading();
      return;
    }
    const ranges = rangesForLine(element, line, "data-read-aloud-section");
    paintReading(ranges);
    ranges[0]?.startContainer.parentElement?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [index, root]);
  useEffect(() => clearReading, []);

  const start = () => {
    const element = root.current;
    if (!element) return;
    const lines = buildScript(element, lang, "data-read-aloud-section");
    if (lines.length === 0) {
      toast("Nothing to read aloud yet");
      return;
    }
    script.current = lines;
    narration
      .start(
        lines.map((line) => line.text),
        0,
      )
      .catch((error: unknown) =>
        toast.error("Couldn’t read aloud", {
          description: error instanceof Error ? error.message : undefined,
        }),
      );
  };

  return (
    <>
      <IconButton
        label={narration.state ? "Stop reading aloud" : "Read aloud"}
        tone={narration.state ? "accent" : "default"}
        className={cn(narration.state && "bg-accent/15", className)}
        onClick={() => (narration.state ? narration.close() : start())}
      >
        <HeadphonesIcon size={19} />
      </IconButton>
      {createPortal(
        <AnimatePresence>
          {narration.state && (
            <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(12px,env(safe-area-inset-bottom))+64px)] z-30 flex justify-center px-3 md:bottom-6">
              <NarrationBar
                className="pointer-events-auto"
                state={narration.state}
                lang={lang}
                onToggle={narration.toggle}
                onSeek={narration.seek}
                onClose={narration.close}
              />
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
