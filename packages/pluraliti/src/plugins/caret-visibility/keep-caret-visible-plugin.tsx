import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from "lexical";
import { useEffect } from "react";

/** Room kept between the caret and whatever covers the bottom of the screen. */
const MARGIN = 24;

/** The nearest ancestor that scrolls vertically. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
}

/**
 * Keeps the line being typed in view, above the keyboard and above
 * anything floating at the bottom (`coveredFrom` returns where that cover
 * starts, in viewport pixels), as the caret moves and as the keyboard
 * opens or closes.
 */
export function KeepCaretVisiblePlugin({ coveredFrom }: { coveredFrom?: () => number }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let frame = 0;
    const reveal = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = editor.getRootElement();
        const selection = window.getSelection();
        if (!root || !editor.isEditable() || !selection?.rangeCount) return;
        if (!root.contains(selection.anchorNode)) return;
        const range = selection.getRangeAt(0);
        // A collapsed caret in an empty line has no box; use its element's.
        const rect =
          range.getClientRects()[0] ??
          (range.startContainer instanceof Element
            ? range.startContainer.getBoundingClientRect()
            : range.startContainer.parentElement?.getBoundingClientRect());
        if (!rect) return;
        const viewport = window.visualViewport;
        const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        const limit = Math.min(visibleBottom, coveredFrom?.() ?? visibleBottom) - MARGIN;
        const overflow = rect.bottom - limit;
        if (overflow > 0) scrollParent(root)?.scrollBy({ top: overflow });
      });
    };

    const unregister = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        reveal();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const removeUpdate = editor.registerUpdateListener(({ tags }) => {
      if (!tags.has("collaboration")) reveal();
    });
    window.visualViewport?.addEventListener("resize", reveal);
    return () => {
      cancelAnimationFrame(frame);
      unregister();
      removeUpdate();
      window.visualViewport?.removeEventListener("resize", reveal);
    };
  }, [editor, coveredFrom]);

  return null;
}
