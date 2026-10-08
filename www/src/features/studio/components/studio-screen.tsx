import { createId } from "@notables/core";
import {
  BrushIcon,
  BubbleIcon,
  Button,
  cn,
  confirmDialog,
  DrawIcon,
  EraserIcon,
  HighlighterIcon,
  IconButton,
  PhotoIcon,
  PointerIcon,
  RedoIcon,
  spring,
  toast,
  UndoIcon,
} from "@ultrapeach/ui";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { saveMedia } from "../../../platform/storage/media-store";
import { useSceneHistory } from "../lib/use-scene-history";
import {
  type BubbleStyle,
  type PageScene,
  type PictureItem,
  panelAt,
  type SceneItem,
} from "../model/page-scene";
import { BubbleInspector } from "./bubble-inspector";
import { PageMenu } from "./page-menu";
import { StudioCanvas, type StudioTool } from "./studio-canvas";

const colors = [
  { value: "#141210", label: "Ink" },
  { value: "#6b6863", label: "Grey" },
  { value: "#ffffff", label: "White" },
  { value: "#d0342c", label: "Red" },
  { value: "#e8892b", label: "Orange" },
  { value: "#f2c53d", label: "Yellow" },
  { value: "#2f8f4e", label: "Green" },
  { value: "#2a6fd6", label: "Blue" },
  { value: "#7a4fc4", label: "Purple" },
  { value: "#e7b493", label: "Skin" },
];

const sizes: Record<"pen" | "brush" | "marker", number[]> = {
  pen: [2, 4, 7, 11],
  brush: [10, 18, 28, 42],
  marker: [18, 30, 46, 64],
};

const toolLabels: Record<StudioTool, string> = {
  select: "Select and move",
  pen: "Pen",
  brush: "Brush",
  marker: "Marker",
  eraser: "Eraser",
  bubble: "Speech bubble",
};

/**
 * A full-screen canvas for one comic, manga or picture-book page: panels,
 * pens and brushes, speech bubbles and pictures, with undo.
 */
export function StudioScreen({
  initial,
  onDone,
  onCancel,
}: {
  initial: PageScene;
  onDone: (scene: PageScene) => Promise<void>;
  onCancel: () => void;
}) {
  const history = useSceneHistory(initial);
  const { scene } = history;
  const [tool, setTool] = useState<StudioTool>("pen");
  const [color, setColor] = useState(colors[0]?.value ?? "#141210");
  const [sizeIndex, setSizeIndex] = useState({ pen: 1, brush: 1, marker: 1 });
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>("speech");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const pictureInput = useRef<HTMLInputElement>(null);
  const selected = scene.items.find((item) => item.id === selectedId) ?? null;

  const brush = tool === "pen" || tool === "brush" || tool === "marker" ? tool : "pen";
  const size = sizes[brush][sizeIndex[brush]] ?? 4;

  const updateItem = (id: string, change: Partial<SceneItem>) =>
    history.apply((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? ({ ...item, ...change } as SceneItem) : item,
      ),
    }));
  const removeItem = (id: string) => {
    history.apply((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));
    setSelectedId(null);
  };
  const restack = (id: string, toFront: boolean) =>
    history.apply((current) => {
      const item = current.items.find((entry) => entry.id === id);
      if (!item) return current;
      const rest = current.items.filter((entry) => entry.id !== id);
      return { ...current, items: toFront ? [...rest, item] : [item, ...rest] };
    });

  const addPicture = async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const natural = await new Promise<{ w: number; h: number }>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
      image.onerror = () => resolve({ w: 4, h: 3 });
      image.src = url;
    });
    URL.revokeObjectURL(url);
    const id = await saveMedia(file);
    // Fill the selected bubble's panel, or most of the page.
    const target =
      (selected && selected.type !== "stroke"
        ? panelAt(scene, selected.x + selected.w / 2, selected.y + selected.h / 2)
        : null) ?? (scene.panels.length === 1 ? scene.panels[0] : null);
    const box = target ?? {
      x: scene.width * 0.1,
      y: scene.height * 0.1,
      w: scene.width * 0.8,
      h: scene.height * 0.8,
    };
    const fit = Math.max(box.w / natural.w, box.h / natural.h);
    const w = natural.w * fit;
    const h = natural.h * fit;
    const picture: PictureItem = {
      id: createId(),
      type: "picture",
      src: `media:${id}`,
      x: box.x + (box.w - w) / 2,
      y: box.y + (box.h - h) / 2,
      w,
      h,
      panel: target && "id" in target ? target.id : null,
    };
    // Pictures go behind drawing and words.
    history.apply((current) => ({ ...current, items: [picture, ...current.items] }));
    setSelectedId(picture.id);
    setTool("select");
  };

  const finish = async () => {
    setSaving(true);
    setSelectedId(null);
    try {
      await onDone(scene);
    } catch (error) {
      console.error(error);
      toast.error("The page couldn’t be saved", { description: "Try again in a moment." });
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (
      history.changed &&
      !(await confirmDialog({
        title: "Discard this page?",
        message: "Your drawing since you opened it will be lost.",
        confirmLabel: "Discard",
        destructive: true,
      }))
    ) {
      return;
    }
    onCancel();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest("input, textarea");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !typing) {
        event.preventDefault();
        if (event.shiftKey) history.redo();
        else history.undo();
      } else if ((event.key === "Backspace" || event.key === "Delete") && selectedId && !typing) {
        event.preventDefault();
        removeItem(selectedId);
      } else if (event.key === "Escape" && !typing) {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Drawing studio"
      className="fixed inset-0 z-[70] flex flex-col bg-sidebar"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={spring.smooth}
    >
      <header
        data-tauri-drag-region
        className="flex items-center justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2"
      >
        <Button variant="ghost" onClick={() => void cancel()} disabled={saving}>
          Cancel
        </Button>
        <div className="flex items-center gap-1">
          <IconButton label="Undo" disabled={!history.canUndo} onClick={history.undo}>
            <UndoIcon size={19} />
          </IconButton>
          <IconButton label="Redo" disabled={!history.canRedo} onClick={history.redo}>
            <RedoIcon size={19} />
          </IconButton>
          <PageMenu scene={scene} onChange={(next) => history.apply(() => next)} />
          <IconButton
            label={zoom === 1 ? "Zoom in" : "Fit page"}
            onClick={() => setZoom((value) => (value === 1 ? 2 : 1))}
          >
            <span className="text-footnote font-semibold tabular-nums">
              {zoom === 1 ? "1×" : "2×"}
            </span>
          </IconButton>
        </div>
        <Button variant="primary" onClick={() => void finish()} disabled={saving}>
          {saving ? "Saving…" : "Done"}
        </Button>
      </header>

      <div className="flex min-h-0 grow overflow-auto">
        <div
          className={cn(
            "m-auto flex justify-center p-4 md:p-8",
            zoom === 1 ? "h-full w-full items-center" : "w-[200%] items-start",
          )}
        >
          <div
            className="flex justify-center"
            style={{
              width:
                zoom === 1
                  ? `min(100%, calc((100dvh - 230px) * ${scene.width / scene.height}))`
                  : "100%",
            }}
          >
            <StudioCanvas
              scene={scene}
              tool={tool}
              color={color}
              size={size}
              bubbleStyle={bubbleStyle}
              selectedId={selectedId}
              zoom={1}
              onSelect={setSelectedId}
              onPreview={history.preview}
              onCommit={history.commit}
              onApply={(change) => {
                history.apply(change);
                if (tool === "bubble") setTool("select");
              }}
            />
          </div>
        </div>
      </div>

      <footer className="flex flex-col items-center gap-2 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        {selected && selected.type === "bubble" ? (
          <BubbleInspector
            bubble={selected}
            onChange={(change) => updateItem(selected.id, change)}
            onRemove={() => removeItem(selected.id)}
            onRestack={(front) => restack(selected.id, front)}
          />
        ) : selected && selected.type === "picture" ? (
          <ToolRow>
            <span className="px-2 text-footnote text-label-secondary">Picture</span>
            <Button variant="ghost" onClick={() => restack(selected.id, true)}>
              To front
            </Button>
            <Button variant="ghost" onClick={() => restack(selected.id, false)}>
              To back
            </Button>
            <Button variant="ghost" className="text-danger" onClick={() => removeItem(selected.id)}>
              Delete
            </Button>
          </ToolRow>
        ) : tool === "bubble" ? (
          <ToolRow>
            {(["speech", "thought", "shout", "caption", "text"] as const).map((style) => (
              <Chip
                key={style}
                active={bubbleStyle === style}
                onClick={() => setBubbleStyle(style)}
              >
                {bubbleStyleLabels[style]}
              </Chip>
            ))}
            <span className="px-2 text-caption text-label-tertiary">Tap the page to place it</span>
          </ToolRow>
        ) : tool === "pen" || tool === "brush" || tool === "marker" ? (
          <ToolRow>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Colour">
              {colors.map((option) => (
                // biome-ignore lint/a11y/useSemanticElements: a swatch row reads better as buttons.
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={color === option.value}
                  aria-label={option.label}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "size-7 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)] transition-transform",
                    color === option.value &&
                      "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-elevated",
                  )}
                  style={{ background: option.value }}
                />
              ))}
            </div>
            <span className="mx-1 h-6 w-px bg-separator" />
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Size">
              {sizes[brush].map((value, index) => (
                // biome-ignore lint/a11y/useSemanticElements: sizes are shown as dots.
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={sizeIndex[brush] === index}
                  aria-label={`Size ${index + 1}`}
                  onClick={() => setSizeIndex((current) => ({ ...current, [brush]: index }))}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-colors",
                    sizeIndex[brush] === index ? "bg-fill" : "hover:bg-fill/60",
                  )}
                >
                  <span
                    className="rounded-full bg-label"
                    style={{ width: 4 + index * 4, height: 4 + index * 4 }}
                  />
                </button>
              ))}
            </div>
          </ToolRow>
        ) : null}

        <ToolRow>
          <ToolButton tool="select" current={tool} onPick={setTool}>
            <PointerIcon size={19} />
          </ToolButton>
          <ToolButton tool="pen" current={tool} onPick={setTool}>
            <DrawIcon size={19} />
          </ToolButton>
          <ToolButton tool="brush" current={tool} onPick={setTool}>
            <BrushIcon size={19} />
          </ToolButton>
          <ToolButton tool="marker" current={tool} onPick={setTool}>
            <HighlighterIcon size={19} />
          </ToolButton>
          <ToolButton tool="eraser" current={tool} onPick={setTool}>
            <EraserIcon size={19} />
          </ToolButton>
          <ToolButton tool="bubble" current={tool} onPick={setTool}>
            <BubbleIcon size={19} />
          </ToolButton>
          <IconButton label="Add a picture" onClick={() => pictureInput.current?.click()}>
            <PhotoIcon size={19} />
          </IconButton>
          <input
            ref={pictureInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void addPicture(file);
            }}
          />
        </ToolRow>
      </footer>
    </motion.div>
  );
}

export const bubbleStyleLabels: Record<BubbleStyle, string> = {
  speech: "Speech",
  thought: "Thought",
  shout: "Shout",
  caption: "Caption",
  text: "Sound",
};

function ToolRow({ children }: { children: ReactNode }) {
  return (
    <div className="glass-menu no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-full px-2 py-1.5">
      {children}
    </div>
  );
}

function ToolButton({
  tool,
  current,
  onPick,
  children,
}: {
  tool: StudioTool;
  current: StudioTool;
  onPick: (tool: StudioTool) => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      label={toolLabels[tool]}
      aria-pressed={current === tool}
      tone={current === tool ? "accent" : "default"}
      className={cn(current === tool && "bg-accent/15")}
      onClick={() => onPick(tool)}
    >
      {children}
    </IconButton>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-footnote font-medium transition-colors",
        active ? "bg-inverse text-on-inverse" : "text-label-secondary hover:bg-fill/60",
      )}
    >
      {children}
    </button>
  );
}
