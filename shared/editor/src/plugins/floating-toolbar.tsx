import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { cn, LinkIcon } from "@notables/ui";
import {
  $getSelection,
  $isRangeSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
} from "lexical";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sanitizeUrl } from "../url";
import { useSelectionState } from "../use-selection-state";

interface Position {
  top: number;
  left: number;
}

const GAP = 10;

function selectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

/** The dark pill that floats above selected text: bold, italic, highlight, link. */
export function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const state = useSelectionState();
  const toolbar = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);

  const update = useCallback(() => {
    const show = editor.getEditorState().read(() => {
      const selection = $getSelection();
      return (
        $isRangeSelection(selection) &&
        !selection.isCollapsed() &&
        selection.getTextContent().trim() !== ""
      );
    });
    const rect = show && editor.isEditable() ? selectionRect() : null;
    setOpen(Boolean(rect));
    if (!rect) {
      setLinkDraft(null);
      return;
    }
    const width = toolbar.current?.offsetWidth ?? 220;
    const height = toolbar.current?.offsetHeight ?? 42;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 8,
    );
    const above = rect.top - height - GAP;
    setPosition({ left, top: above > 8 ? above : rect.bottom + GAP });
  }, [editor]);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(() => update()),
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            update();
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(
          BLUR_COMMAND,
          (event) => {
            if (!toolbar.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
      ),
    [editor, update],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => update();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, update]);

  const format = (type: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);

  const commitLink = () => {
    const url = sanitizeUrl(linkDraft ?? "");
    if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    setLinkDraft(null);
    editor.focus();
  };

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={toolbar}
      role="toolbar"
      aria-label="Text formatting"
      className="nt-floating"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
      }}
    >
      {linkDraft === null ? (
        <>
          <FormatButton label="Bold" active={state.bold} onClick={() => format("bold")}>
            <b>B</b>
          </FormatButton>
          <FormatButton label="Italic" active={state.italic} onClick={() => format("italic")}>
            <i className="nt-floating-serif">I</i>
          </FormatButton>
          <FormatButton
            label="Strikethrough"
            active={state.strikethrough}
            onClick={() => format("strikethrough")}
          >
            <s>S</s>
          </FormatButton>
          <FormatButton
            label="Highlight"
            active={state.highlight}
            onClick={() => format("highlight")}
          >
            <span className="nt-floating-swatch" />
          </FormatButton>
          <FormatButton
            label={state.link ? "Remove link" : "Add link"}
            active={Boolean(state.link)}
            onClick={() =>
              state.link ? editor.dispatchCommand(TOGGLE_LINK_COMMAND, null) : setLinkDraft("")
            }
          >
            <LinkIcon size={16} strokeWidth={2} />
          </FormatButton>
        </>
      ) : (
        <form
          className="nt-floating-link"
          onSubmit={(event) => {
            event.preventDefault();
            commitLink();
          }}
        >
          <input
            // biome-ignore lint/a11y/noAutofocus: the field appears in response to the user's click
            autoFocus
            type="url"
            inputMode="url"
            aria-label="Link address"
            placeholder="Paste or type a link"
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setLinkDraft(null);
                editor.focus();
              }
            }}
          />
          <button type="submit">Add</button>
        </form>
      )}
    </div>,
    document.body,
  );
}

function FormatButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn("nt-floating-btn", active && "is-active")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
