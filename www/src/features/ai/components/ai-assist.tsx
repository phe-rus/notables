import { useWritingBridge } from "@notables/editor";
import {
  Button,
  CloseIcon,
  IconButton,
  openContextMenu,
  SparkleIcon,
  spring,
  toast,
} from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AiError, streamText } from "../lib/stream-text";
import { WRITING_SYSTEM, type WritingAction, writingActions } from "../lib/writing-actions";
import { providerInfo } from "../model/providers";
import { readAiKey, useAiSettings } from "../store/ai-settings";

type Run =
  | { state: "idle" }
  | { state: "working" | "done"; action: WritingAction; text: string; usedSelection: boolean }
  | { state: "failed"; action: WritingAction; message: string; needsSettings: boolean };

/**
 * The writing helper in a note: summarize, improve, proofread, continue or
 * title, with the person's own AI key. Shown only once AI is turned on.
 * The reply streams into a panel and goes into the note only when asked.
 */
export function AiAssist() {
  const settings = useAiSettings();
  const bridge = useWritingBridge();
  const [run, setRun] = useState<Run>({ state: "idle" });
  const abort = useRef<AbortController | null>(null);

  if (!settings.enabled) return null;
  const provider = providerInfo[settings.provider];

  const start = async (action: WritingAction) => {
    const source = bridge.read();
    const usedSelection = action.usesSelection && source.selected.length > 0;
    const text = usedSelection ? source.selected : source.full;
    if (!text.trim()) {
      toast("Write something first", { description: "The helper works from what’s in the note." });
      return;
    }
    const apiKey = await readAiKey(settings.provider);
    if (!apiKey) {
      setRun({
        state: "failed",
        action,
        message: `Add your ${provider.label} API key in Settings to use the writing helper.`,
        needsSettings: true,
      });
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setRun({ state: "working", action, text: "", usedSelection });
    let reply = "";
    try {
      await streamText({
        provider: settings.provider,
        model: settings.models[settings.provider],
        apiKey,
        system: WRITING_SYSTEM,
        prompt: action.prompt(text),
        maxTokens: action.id === "title" ? 200 : undefined,
        signal: controller.signal,
        onText: (chunk) => {
          reply += chunk;
          setRun({ state: "working", action, text: reply, usedSelection });
        },
      });
      setRun({ state: "done", action, text: reply.trim(), usedSelection });
    } catch (error) {
      if (controller.signal.aborted) return;
      setRun({
        state: "failed",
        action,
        message: error instanceof AiError ? error.message : "Something went wrong. Try again.",
        needsSettings: error instanceof AiError && /Settings/.test(error.message),
      });
    }
  };

  const close = () => {
    abort.current?.abort();
    setRun({ state: "idle" });
  };

  const apply = () => {
    if (run.state !== "done") return;
    if (run.action.apply === "title") bridge.setTitle(run.text);
    else if (run.action.apply === "replace" && run.usedSelection) bridge.replaceSelection(run.text);
    else bridge.insertBelow(run.text);
    close();
  };

  return (
    <>
      <IconButton
        label={`Writing help with ${provider.label}`}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          // Read now, while the selection is still the person's.
          bridge.read();
          openContextMenu(rect.left, rect.bottom + 6, [
            { heading: `Writing help · ${provider.label}` },
            ...writingActions.map((action) => ({
              label: action.label,
              onSelect: () => void start(action),
            })),
          ]);
        }}
      >
        <SparkleIcon size={19} />
      </IconButton>
      {createPortal(
        <AnimatePresence>
          {run.state !== "idle" && (
            <motion.section
              aria-label={run.action.label}
              aria-live="polite"
              className="glass-menu fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-[65] flex max-h-[min(70dvh,560px)] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] max-md:bottom-24"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={spring.smooth}
            >
              <header className="flex items-center gap-2 px-4 pt-3.5 pb-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                  <SparkleIcon size={15} />
                </span>
                <span className="grow text-[15px] font-semibold">{run.action.label}</span>
                <span className="text-[12px] text-label-tertiary">{provider.label}</span>
                <IconButton label="Close" onClick={close}>
                  <CloseIcon size={17} />
                </IconButton>
              </header>
              <div className="min-h-[72px] overflow-y-auto px-4 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">
                {run.state === "failed" ? (
                  <p className="text-danger">{run.message}</p>
                ) : run.text ? (
                  run.text
                ) : (
                  <span className="text-label-tertiary">Thinking…</span>
                )}
              </div>
              <footer className="flex items-center justify-end gap-2 border-t border-separator/60 px-4 py-3">
                {run.state === "working" && (
                  <Button variant="secondary" onClick={close}>
                    Stop
                  </Button>
                )}
                {run.state === "failed" && run.needsSettings && (
                  <Link
                    to="/settings"
                    hash="ai"
                    onClick={close}
                    className="rounded-full bg-inverse px-4 py-2 text-[14px] font-semibold text-on-inverse no-underline"
                  >
                    Open Settings
                  </Link>
                )}
                {run.state === "done" && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(run.text).then(() => toast("Copied"));
                      }}
                    >
                      Copy
                    </Button>
                    <Button variant="primary" onClick={apply}>
                      {run.action.apply === "replace" && !run.usedSelection
                        ? "Add below"
                        : run.action.applyLabel}
                    </Button>
                  </>
                )}
              </footer>
            </motion.section>
          )}
        </AnimatePresence>,
        window.document.body,
      )}
    </>
  );
}
