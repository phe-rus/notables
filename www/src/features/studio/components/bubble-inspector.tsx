import { Button, cn } from "@ultrapeach/ui";
import { useEffect, useRef } from "react";
import { fontFamilies, fontLabels } from "../lib/scene-geometry";
import type { BubbleFont, BubbleItem, BubbleStyle } from "../model/page-scene";
import { bubbleStyleLabels, Chip } from "./studio-screen";

const MIN_SIZE = 18;
const MAX_SIZE = 96;

/** The words in a bubble, its shape, lettering and size. */
export function BubbleInspector({
  bubble,
  onChange,
  onRemove,
  onRestack,
}: {
  bubble: BubbleItem;
  onChange: (change: Partial<BubbleItem>) => void;
  onRemove: () => void;
  onRestack: (toFront: boolean) => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  // A new, empty bubble is ready for typing.
  useEffect(() => {
    if (!bubble.text) field.current?.focus({ preventScroll: true });
  }, [bubble.id, bubble.text]);

  const setStyle = (style: BubbleStyle) => {
    const boxed = style === "caption" || style === "text";
    onChange({
      style,
      tail: boxed
        ? null
        : (bubble.tail ?? { x: bubble.x + bubble.w * 0.25, y: bubble.y + bubble.h + 90 }),
    });
  };

  return (
    <div className="glass-menu flex w-full max-w-[640px] flex-col gap-2 rounded-5xl p-2.5">
      <textarea
        ref={field}
        value={bubble.text}
        rows={2}
        placeholder="What do they say?"
        aria-label="Bubble text"
        onChange={(event) => onChange({ text: event.target.value })}
        className="w-full resize-none rounded-2xl bg-fill/50 px-3 py-2 text-callout text-label outline-none placeholder:text-label-tertiary"
        style={{ fontFamily: fontFamilies[bubble.font] }}
      />
      <div className="no-scrollbar scroll-fade-x -mx-2 flex items-center gap-1 overflow-x-auto px-2">
        {(Object.keys(bubbleStyleLabels) as BubbleStyle[]).map((style) => (
          <Chip key={style} active={bubble.style === style} onClick={() => setStyle(style)}>
            {bubbleStyleLabels[style]}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar scroll-fade-x -mx-2 flex items-center gap-1 overflow-x-auto px-2">
        {(Object.keys(fontLabels) as BubbleFont[]).map((font) => (
          <button
            key={font}
            type="button"
            aria-pressed={bubble.font === font}
            onClick={() => onChange({ font })}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-subheadline transition-colors",
              bubble.font === font ? "bg-fill text-label" : "text-label-secondary hover:bg-fill/60",
            )}
            style={{ fontFamily: fontFamilies[font] }}
          >
            {fontLabels[font]}
          </button>
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-separator" />
        <Button
          variant="ghost"
          aria-label="Smaller text"
          disabled={bubble.fontSize <= MIN_SIZE}
          onClick={() => onChange({ fontSize: Math.max(MIN_SIZE, bubble.fontSize - 4) })}
        >
          A−
        </Button>
        <Button
          variant="ghost"
          aria-label="Larger text"
          disabled={bubble.fontSize >= MAX_SIZE}
          onClick={() => onChange({ fontSize: Math.min(MAX_SIZE, bubble.fontSize + 4) })}
        >
          A+
        </Button>
        <span className="grow" />
        <Button variant="ghost" onClick={() => onRestack(true)}>
          Front
        </Button>
        <Button variant="ghost" className="text-danger" onClick={onRemove}>
          Delete
        </Button>
      </div>
    </div>
  );
}
