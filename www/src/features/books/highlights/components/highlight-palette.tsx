import { CheckIcon, cn, spring, TrashIcon, toast } from "@notables/ui";
import { AnimatePresence, motion } from "motion/react";
import { type RefObject, useEffect, useState } from "react";
import { highlightAt, quoteFromRange } from "../lib/selection-quote";
import type { TextQuote } from "../lib/text-quote";
import {
  getHighlightStore,
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type HighlightEntry,
} from "../store/highlight-store";

export const swatchClass: Record<HighlightColor, string> = {
  yellow: "bg-[#f7d154]",
  green: "bg-[#8fd18a]",
  blue: "bg-[#8cc2f2]",
  pink: "bg-[#f29bbf]",
};

type Target =
  | { kind: "new"; noteId: string; quote: TextQuote; rect: DOMRect }
  | { kind: "existing"; entry: HighlightEntry; rect: DOMRect };

const PALETTE_WIDTH = 236;
const PALETTE_HEIGHT = 44;

/**
 * While highlighting, selecting words offers colours; tapping a highlight
 * offers to recolour, copy or remove it. The palette floats above the
 * words like the system's own selection menu.
 */
export function HighlightPalette({
  root,
  bookId,
  entries,
  enabled,
}: {
  root: RefObject<HTMLElement | null>;
  bookId: string;
  entries: HighlightEntry[];
  enabled: boolean;
}) {
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTarget(null);
      return;
    }
    const element = root.current;
    if (!element) return;
    const onRelease = (event: PointerEvent | KeyboardEvent) => {
      // Let the selection settle first.
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const made = element.contains(range.commonAncestorContainer)
            ? quoteFromRange(range)
            : null;
          setTarget(made ? { kind: "new", ...made, rect: range.getBoundingClientRect() } : null);
          return;
        }
        if (event instanceof PointerEvent) {
          const hit = highlightAt(event.clientX, event.clientY, entries);
          setTarget(
            hit
              ? { kind: "existing", entry: hit.entry, rect: hit.range.getBoundingClientRect() }
              : null,
          );
        }
      });
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTarget(null);
      else if (event.shiftKey) onRelease(event);
    };
    element.addEventListener("pointerup", onRelease);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      element.removeEventListener("pointerup", onRelease);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enabled, entries, root]);

  const close = () => {
    setTarget(null);
    window.getSelection()?.removeAllRanges();
  };

  const choose = (color: HighlightColor) => {
    if (!target) return;
    if (target.kind === "new") {
      getHighlightStore().add({ bookId, noteId: target.noteId, quote: target.quote, color });
    } else {
      getHighlightStore().recolor(target.entry.id, color);
    }
    close();
  };

  const copy = async () => {
    if (!target) return;
    const text = target.kind === "new" ? target.quote.exact : target.entry.quote.exact;
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      toast.error("Couldn’t copy");
    }
    close();
  };

  const remove = () => {
    if (target?.kind !== "existing") return;
    getHighlightStore().remove(target.entry.id);
    close();
  };

  const placement = target ? place(target.rect) : null;
  const current = target?.kind === "existing" ? target.entry.color : null;

  return (
    <AnimatePresence>
      {target && placement && (
        <motion.div
          role="toolbar"
          aria-label="Highlight"
          initial={{ opacity: 0, scale: 0.9, y: placement.below ? -6 : 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={spring.snappy}
          // Keep the selection while pressing the palette.
          onPointerDown={(event) => event.preventDefault()}
          className="glass-menu fixed z-[70] flex items-center gap-1 rounded-full p-1.5"
          style={{ left: placement.left, top: placement.top, minHeight: PALETTE_HEIGHT }}
        >
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Highlight ${color}`}
              aria-pressed={current === color}
              onClick={() => choose(color)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-black/70 ring-1 ring-black/10 transition-transform active:scale-90",
                swatchClass[color],
              )}
            >
              {current === color && <CheckIcon size={15} strokeWidth={2.4} />}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-separator" />
          <button
            type="button"
            onClick={copy}
            className="h-8 rounded-full px-3 text-[13px] font-semibold text-label hover:bg-fill"
          >
            Copy
          </button>
          {target.kind === "existing" && (
            <button
              type="button"
              aria-label="Remove highlight"
              onClick={remove}
              className="flex size-8 items-center justify-center rounded-full text-danger hover:bg-fill"
            >
              <TrashIcon size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Above the words when there's room, otherwise below; always on screen. */
function place(rect: DOMRect) {
  const margin = 10;
  const below = rect.top < PALETTE_HEIGHT + margin * 3;
  const top = below ? rect.bottom + margin : rect.top - PALETTE_HEIGHT - margin;
  const left = Math.min(
    window.innerWidth - PALETTE_WIDTH - margin,
    Math.max(margin, rect.left + rect.width / 2 - PALETTE_WIDTH / 2),
  );
  return { top, left, below };
}
