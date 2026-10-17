import { $isListItemNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNearestNodeFromDOMNode,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
} from "lexical";
import { useEffect, useRef } from "react";

/** Moving further than this, in CSS pixels, makes a touch a scroll, not a tap. */
const TAP_SLOP = 10;
/** Held longer than this, a touch is a press (select, menu), not a tap. */
const TAP_TIME = 450;
/** Elements that keep their own tap while reading. */
const OWN_TAP = "a, button, input, label, select, textarea, [role='checkbox'], [data-own-tap]";

/** The caret position under a point, in either engine's API. */
function caretAt(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) {
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }
  return doc.caretRangeFromPoint?.(x, y) ?? null;
}

/**
 * Reading and editing, as in Apple Notes: while `reading`, the note can't
 * be edited, so scrolling never brings up the keyboard; a tap on its text
 * (not a scroll or a press) asks to edit with `onEdit`, and once editing
 * the caret lands where the tap was.
 */
export function ReadModePlugin({ reading, onEdit }: { reading: boolean; onEdit: () => void }) {
  const [editor] = useLexicalComposerContext();
  const pending = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    editor.setEditable(!reading);
    const point = pending.current;
    const root = editor.getRootElement();
    if (reading || !point || !root) return;
    pending.current = null;
    // Focus first, then place the caret: Lexical follows the DOM selection.
    root.focus({ preventScroll: true });
    const range = caretAt(point.x, point.y);
    if (range && root.contains(range.startContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editor, reading]);

  useEffect(() => {
    if (!reading) return;
    const unregister = editor.registerRootListener((root, previous) => {
      previous?.removeEventListener("pointerdown", onDown);
      root?.addEventListener("pointerdown", onDown);
    });
    return () => {
      unregister();
      editor.getRootElement()?.removeEventListener("pointerdown", onDown);
    };

    function onDown(down: PointerEvent) {
      if (!down.isPrimary) return;
      const target = down.target;
      if (target instanceof HTMLElement && target.matches('li[role="checkbox"]')) {
        const rect = target.getBoundingClientRect();
        const rtl = getComputedStyle(target).direction === "rtl";
        const width = Number.parseFloat(getComputedStyle(target, "::before").width) || 20;
        const distance = rtl ? rect.right - down.clientX : down.clientX - rect.left;
        if (distance >= -8 && distance <= width + 8) {
          down.preventDefault();
          const started = performance.now();
          const finish = (up: PointerEvent) => {
            cleanup();
            if (
              Math.hypot(up.clientX - down.clientX, up.clientY - down.clientY) > TAP_SLOP ||
              performance.now() - started > TAP_TIME
            )
              return;
            editor.update(
              () => {
                const node = $getNearestNodeFromDOMNode(target);
                if ($isListItemNode(node)) node.toggleChecked();
              },
              { tag: [SKIP_DOM_SELECTION_TAG, SKIP_SELECTION_FOCUS_TAG] },
            );
          };
          const cleanup = () => {
            window.removeEventListener("pointerup", finish);
            window.removeEventListener("pointercancel", cleanup);
          };
          window.addEventListener("pointerup", finish);
          window.addEventListener("pointercancel", cleanup);
          return;
        }
      }
      if ((down.target as Element).closest(OWN_TAP)) return;
      const started = performance.now();
      const finish = (up: PointerEvent) => {
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", cancel);
        const moved = Math.hypot(up.clientX - down.clientX, up.clientY - down.clientY);
        if (moved > TAP_SLOP || performance.now() - started > TAP_TIME) return;
        pending.current = { x: up.clientX, y: up.clientY };
        onEdit();
      };
      const cancel = () => {
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", cancel);
      };
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", cancel);
    }
  }, [editor, reading, onEdit]);

  return null;
}
