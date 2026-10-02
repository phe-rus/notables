import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  CanvasIcon,
  ChecklistIcon,
  cn,
  DrawIcon,
  IconButton,
  MicIcon,
  PhotoIcon,
  Popover,
  useDismiss,
} from "@notables/ui";
import { useCallback, useId, useRef, useState } from "react";
import { type BlockType, blockLabels, setBlockType } from "../blocks/block-types";
import { useSelectionState } from "../hooks/use-selection-state";
import { useDrawingStudio } from "../media/drawing-studio";
import { INSERT_IMAGE_COMMAND, INSERT_INK_COMMAND } from "../plugins/media/media-plugin";

const BLOCK_MENU_ORDER: BlockType[] = [
  "title",
  "heading",
  "subheading",
  "body",
  "quote",
  "code",
  "bullet",
  "number",
  "check",
];

/** Largest photo embedded inline until the on-device media store lands. */
const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface BlockToolbarProps {
  /** Stores a picked photo and returns its URL. Defaults to an inline data URL. */
  resolvePhoto?: (file: File) => Promise<string>;
  onRecord?: () => void;
  onDraw?: () => void;
  /** Open the text-style menu below the toolbar, or above it for bottom bars. */
  menuPlacement?: "below" | "above";
  className?: string;
}

/** The editor's top toolbar: text styles, checklist, photo, record, draw. */
export function BlockToolbar({
  resolvePhoto,
  onRecord,
  onDraw,
  menuPlacement = "below",
  className,
}: BlockToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const studio = useDrawingStudio();
  const state = useSelectionState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const drawPage = async () => {
    const drawing = await studio?.open(null);
    if (drawing) editor.dispatchCommand(INSERT_IMAGE_COMMAND, drawing);
  };
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(menuRef, menuOpen, closeMenu);

  const choose = (type: BlockType) => {
    setBlockType(editor, type, state.block);
    setMenuOpen(false);
    editor.focus();
  };

  const insertPhoto = async (file: File) => {
    if (!resolvePhoto && file.size > MAX_INLINE_IMAGE_BYTES) return;
    const src = await (resolvePhoto ?? readAsDataUrl)(file);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src, alt: file.name.replace(/\.[^.]+$/, "") });
  };

  return (
    <div
      role="toolbar"
      aria-label="Insert and style"
      className={cn("flex items-center gap-1", className)}
    >
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="Text style"
          title="Text style"
          className="h-[34px] rounded-lg px-2.5 text-[16px] font-semibold text-label transition-colors hover:bg-fill"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Aa
        </button>
        <Popover
          open={menuOpen}
          id={menuId}
          role="menu"
          origin="top-left"
          className={cn(
            "nt-menu",
            menuPlacement === "above" ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+8px)]",
          )}
        >
          {BLOCK_MENU_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitemradio"
              aria-checked={state.block === type}
              className={cn("nt-menu-item", `nt-menu-${type}`)}
              onClick={() => choose(type)}
            >
              {blockLabels[type]}
            </button>
          ))}
        </Popover>
      </div>
      <IconButton
        label="Checklist"
        aria-pressed={state.block === "check"}
        className={cn(state.block === "check" && "bg-fill")}
        onClick={() => setBlockType(editor, "check", state.block)}
      >
        <ChecklistIcon size={19} />
      </IconButton>
      <IconButton label="Insert photo" onClick={() => fileRef.current?.click()}>
        <PhotoIcon size={19} />
      </IconButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void insertPhoto(file);
        }}
      />
      <IconButton label="Record audio" onClick={onRecord} disabled={!onRecord}>
        <MicIcon size={19} />
      </IconButton>
      {studio && (
        <IconButton label="Draw a page" onClick={() => void drawPage()}>
          <CanvasIcon size={19} />
        </IconButton>
      )}
      <IconButton
        label="Write by hand"
        onClick={onDraw ?? (() => editor.dispatchCommand(INSERT_INK_COMMAND, undefined))}
      >
        <DrawIcon size={19} />
      </IconButton>
    </div>
  );
}
