import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  INSERT_TABLE_COMMAND,
} from "@lexical/table";
import {
  AlarmIcon,
  ChaptersIcon,
  ChecklistIcon,
  cn,
  DrawIcon,
  IconButton,
  LayoutIcon,
  LinkIcon,
  MicIcon,
  NoteIcon,
  PhotoIcon,
  PlusIcon,
  Popover,
  RedoIcon,
  ScanCodeIcon,
  toast,
  UndoIcon,
  useDismiss,
} from "@phe-rus/hino";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from "lexical";
import { useCallback, useId, useRef, useState } from "react";
import { type BlockType, setBlockType } from "../blocks/block-types";
import { useSelectionState } from "../hooks/use-selection-state";
import { sanitizeUrl } from "../lib/sanitize-url";
import { useDrawingStudio } from "../media/drawing-studio";
import {
  INSERT_CONTENTS_COMMAND,
  INSERT_IMAGE_COMMAND,
  INSERT_IMAGES_COMMAND,
  INSERT_INK_COMMAND,
} from "../plugins/media/media-plugin";
import { defaultToolbarLabels, type ToolbarLabels } from "./toolbar-labels";

const BLOCKS: BlockType[] = [
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
const FORMATS: Array<keyof ToolbarLabels & TextFormatType> = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "highlight",
  "subscript",
  "superscript",
];
const ALIGNMENTS: ElementFormatType[] = ["left", "center", "right", "justify"];
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
  resolvePhoto?: (file: File) => Promise<string>;
  onRecord?: () => void;
  onDraw?: () => void;
  onAttach?: () => void;
  onLinkPreview?: () => void;
  onReminder?: () => void;
  onScanText?: () => void;
  onScanDocument?: () => void;
  onContents?: () => void;
  labels?: ToolbarLabels;
  menuPlacement?: "below" | "above";
  className?: string;
}

/** Compact controls retain the caret while their menus or file picker have focus. */
export function BlockToolbar({
  resolvePhoto,
  onRecord,
  onDraw,
  onAttach,
  onLinkPreview,
  onReminder,
  onScanText,
  onScanDocument,
  onContents,
  labels = defaultToolbarLabels,
  menuPlacement = "below",
  className,
}: BlockToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const studio = useDrawingStudio();
  const state = useSelectionState();
  const [menu, setMenu] = useState<"format" | "insert" | null>(null);
  const [url, setUrl] = useState("");
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const saved = useRef<BaseSelection | null>(null);
  const close = useCallback(() => setMenu(null), []);
  useDismiss(host, menu !== null, close);
  const remember = () =>
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (selection) saved.current = selection.clone();
    });
  const restore = () => {
    const selection = saved.current;
    if (
      selection &&
      (!$isRangeSelection(selection) ||
        ($getNodeByKey(selection.anchor.key) && $getNodeByKey(selection.focus.key)))
    )
      $setSelection(selection.clone());
  };
  const run = (action: () => void) => {
    editor.update(() => {
      restore();
      action();
    });
  };
  const choose = (type: BlockType) => {
    run(() => setBlockType(editor, type, state.block));
    close();
  };
  const insertPhotos = async (files: File[]) => {
    try {
      const photos: { src: string; alt: string }[] = [];
      for (const item of files) {
        if (!resolvePhoto && item.size > MAX_INLINE_IMAGE_BYTES)
          throw new Error(labels.photoFailed);
        photos.push({
          src: await (resolvePhoto ?? readAsDataUrl)(item),
          alt: item.name.replace(/\.[^.]+$/, ""),
        });
      }
      run(() => {
        editor.dispatchCommand(
          INSERT_IMAGES_COMMAND,
          photos.map((photo) => ({
            ...photo,
            layout: { width: photos.length > 1 ? 50 : 100 },
          })),
        );
      });
    } catch {
      toast.error(labels.photoFailed);
    }
  };
  const insertItems = [
    { label: labels.undo, action: () => editor.dispatchCommand(UNDO_COMMAND, undefined) },
    { label: labels.redo, action: () => editor.dispatchCommand(REDO_COMMAND, undefined) },
    { label: labels.photo, action: () => file.current?.click() },
    ...(state.inTable
      ? [
          { label: labels.addTableRow, action: () => run(() => $insertTableRowAtSelection()) },
          {
            label: labels.addTableColumn,
            action: () => run(() => $insertTableColumnAtSelection()),
          },
          { label: labels.removeTableRow, action: () => run(() => $deleteTableRowAtSelection()) },
          {
            label: labels.removeTableColumn,
            action: () => run(() => $deleteTableColumnAtSelection()),
          },
        ]
      : []),
    {
      label: labels.table,
      action: () =>
        run(() =>
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: "3",
            rows: "3",
            includeHeaders: true,
          }),
        ),
    },
    {
      label: labels.contents,
      action:
        onContents ?? (() => run(() => editor.dispatchCommand(INSERT_CONTENTS_COMMAND, undefined))),
    },
    ...(onLinkPreview ? [{ label: labels.linkPreview, action: onLinkPreview }] : []),
    ...(onAttach ? [{ label: labels.attachment, action: onAttach }] : []),
    ...(onReminder ? [{ label: labels.reminder, action: onReminder }] : []),
    ...(onScanText ? [{ label: labels.scanText, action: onScanText }] : []),
    ...(onScanDocument ? [{ label: labels.scanDocument, action: onScanDocument }] : []),
    ...(onRecord ? [{ label: labels.record, action: onRecord }] : []),
    ...(studio
      ? [
          {
            label: labels.draw,
            action: async () => {
              const drawing = await studio.open(null);
              if (drawing) run(() => editor.dispatchCommand(INSERT_IMAGE_COMMAND, drawing));
            },
          },
        ]
      : []),
    {
      label: labels.handwriting,
      action: onDraw ?? (() => run(() => editor.dispatchCommand(INSERT_INK_COMMAND, undefined))),
    },
  ];
  const insertIcons = [UndoIcon, RedoIcon, PhotoIcon];
  const iconFor = (label: string) => {
    if (label === labels.table || label.includes(labels.addTableColumn)) return LayoutIcon;
    if (label === labels.contents) return ChaptersIcon;
    if (label === labels.linkPreview) return LinkIcon;
    if (label === labels.attachment) return NoteIcon;
    if (label === labels.reminder) return AlarmIcon;
    if (label === labels.scanText || label === labels.scanDocument) return ScanCodeIcon;
    if (label === labels.record) return MicIcon;
    return DrawIcon;
  };
  return (
    <div
      ref={host}
      role="toolbar"
      aria-label={labels.toolbar}
      className={cn("relative min-w-0", className)}
      onPointerDownCapture={(event) => {
        if (!(event.target as HTMLElement).closest("input")) {
          remember();
          // Toolbar presses retain the caret and keyboard on touch as well as mouse.
          event.preventDefault();
        }
      }}
    >
      <div className="no-scrollbar flex w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain px-1 touch-pan-x [&_button]:h-11 [&_button]:min-w-11 [&_button]:shrink-0 [&_button]:rounded-full">
        <div className="shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu === "format"}
            aria-controls={`${id}-format`}
            aria-label={labels.style}
            className="h-9 shrink-0 rounded-2xl px-2 text-callout font-semibold hover:bg-fill"
            onClick={() => {
              setUrl(state.link ?? "");
              setMenu(menu === "format" ? null : "format");
            }}
          >
            Aa
          </button>
        </div>
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.bold}
          aria-pressed={state.bold}
          onClick={() => run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"))}
        >
          <b className="font-serif text-body">B</b>
        </IconButton>
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.italic}
          aria-pressed={state.italic}
          onClick={() => run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"))}
        >
          <i className="font-serif text-body">I</i>
        </IconButton>
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.check}
          aria-pressed={state.block === "check"}
          onClick={() => choose("check")}
        >
          <ChecklistIcon size={19} />
        </IconButton>
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.photo}
          onClick={() => file.current?.click()}
        >
          <PhotoIcon size={19} />
        </IconButton>
        <div className="shrink-0">
          <IconButton
            size="icon-sm"
            variant="ghost"
            label={labels.insert}
            aria-expanded={menu === "insert"}
            onClick={() => setMenu(menu === "insert" ? null : "insert")}
          >
            <PlusIcon size={20} />
          </IconButton>
        </div>
        {onRecord && (
          <IconButton size="icon-sm" variant="ghost" label={labels.record} onClick={onRecord}>
            <MicIcon size={19} />
          </IconButton>
        )}
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.handwriting}
          onClick={
            onDraw ?? (() => run(() => editor.dispatchCommand(INSERT_INK_COMMAND, undefined)))
          }
        >
          <DrawIcon size={19} />
        </IconButton>
        {onAttach && (
          <IconButton size="icon-sm" variant="ghost" label={labels.attachment} onClick={onAttach}>
            <LinkIcon size={20} />
          </IconButton>
        )}
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.table}
          onClick={() => {
            close();
            run(() =>
              editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                columns: "3",
                rows: "3",
                includeHeaders: true,
              }),
            );
          }}
        >
          <LayoutIcon size={20} />
        </IconButton>
        {onScanDocument && (
          <IconButton
            size="icon-sm"
            variant="ghost"
            label={labels.scanDocument}
            onClick={onScanDocument}
          >
            <ScanCodeIcon size={20} />
          </IconButton>
        )}
        {onLinkPreview && (
          <IconButton
            size="icon-sm"
            variant="ghost"
            label={labels.linkPreview}
            onClick={onLinkPreview}
          >
            <LinkIcon size={20} />
          </IconButton>
        )}
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.undo}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        >
          <UndoIcon size={20} />
        </IconButton>
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={labels.redo}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        >
          <RedoIcon size={20} />
        </IconButton>
      </div>
      <Popover
        open={menu === "format"}
        id={`${id}-format`}
        role="menu"
        className={cn(
          "nt-menu start-0 w-[min(340px,calc(100vw-32px))] max-h-[min(50dvh,var(--nt-menu-height,50dvh))] overflow-auto",
          menuPlacement === "above" ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+8px)]",
        )}
      >
        <div className="grid grid-cols-4 gap-0.5 border-b border-separator p-1">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              className="min-h-10 rounded-lg px-1 text-caption hover:bg-fill"
              onClick={() => run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format))}
            >
              {labels[format]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2">
          {BLOCKS.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitemradio"
              aria-checked={state.block === type}
              className={cn("nt-menu-item", `nt-menu-${type}`)}
              onClick={() => choose(type)}
            >
              {labels[type]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 border-t border-separator">
          {ALIGNMENTS.map((alignment) => (
            <button
              key={alignment}
              type="button"
              role="menuitem"
              className="nt-menu-item"
              onClick={() => run(() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment))}
            >
              {labels[alignment as "left" | "center" | "right" | "justify"]}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-1 border-t border-separator p-2"
          onSubmit={(event) => {
            event.preventDefault();
            const safe = sanitizeUrl(url);
            if (safe) {
              run(() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, safe));
              close();
            }
          }}
        >
          <input
            type="url"
            aria-label={labels.link}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
            className="min-w-0 flex-1 rounded-lg control-field px-2 py-2 text-footnote"
          />
          <button type="submit" className="px-2 text-footnote font-semibold text-accent-text">
            {labels.apply}
          </button>
        </form>
        {state.link && (
          <button
            type="button"
            role="menuitem"
            className="nt-menu-item flex items-center gap-3"
            onClick={() => {
              run(() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null));
              close();
            }}
          >
            {labels.removeLink}
          </button>
        )}
      </Popover>
      <Popover
        open={menu === "insert"}
        role="menu"
        className={cn(
          "nt-menu end-0 max-h-[min(50dvh,var(--nt-menu-height,50dvh))] overflow-auto",
          menuPlacement === "above" ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+8px)]",
        )}
      >
        {insertItems.map((item, index) => {
          const ItemIcon = insertIcons[index] ?? iconFor(item.label);
          return (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="nt-menu-item flex items-center gap-3"
              onClick={() => {
                close();
                void item.action();
              }}
            >
              <ItemIcon size={19} className="shrink-0 text-label-secondary" />
              <span className="grow">{item.label}</span>
            </button>
          );
        })}
      </Popover>
      <input
        ref={file}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length) void insertPhotos(files);
        }}
      />
    </div>
  );
}
