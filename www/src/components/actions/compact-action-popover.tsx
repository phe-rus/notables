import { Popover, registerFloatingLayer, useAnchoredPlacement, useDismiss } from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CompactActionPopoverProps } from "./types";

/** A compact row of named actions with a hint that follows pointer and keyboard focus. */
export function CompactActionPopover({
  title,
  hint,
  actions,
  anchor,
  owner,
  onClose,
}: CompactActionPopoverProps) {
  const placement = useAnchoredPlacement(anchor, 344, 124);
  const panel = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [description, setDescription] = useState(hint);
  useDismiss(owner, true, onClose);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const unregister = registerFloatingLayer(element, anchor);
    element.focus({ preventScroll: true });
    return () => {
      unregister();
      if (anchor.isConnected) anchor.focus({ preventScroll: true });
    };
  }, [anchor]);
  return createPortal(
    <div
      ref={panel}
      data-floating-layer
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      aria-describedby={hintId}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      className="fixed z-[70] outline-none"
      style={{
        left: placement.left,
        top: placement.top,
        bottom: placement.bottom,
        width: placement.width,
      }}
    >
      <Popover
        open
        className="relative inset-0 w-full p-4"
        style={{
          maxHeight: placement.maxHeight,
          transformOrigin: placement.above ? "100% 100%" : "100% 0%",
        }}
        onPointerLeave={() => setDescription(hint)}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="min-w-0 flex-1 truncate text-subheadline font-semibold">{title}</h3>
          <div
            role="toolbar"
            aria-label={title}
            className="flex flex-wrap items-center gap-1 [@media(pointer:coarse)]:gap-3"
          >
            {actions.map((action) => (
              <IconButton
                key={action.label}
                size="icon-xs"
                className="[@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-1.5 [@media(pointer:coarse)]:before:content-['']"
                label={action.label}
                variant={action.destructive ? "destructive" : "ghost"}
                disabled={action.disabled}
                aria-describedby={hintId}
                onPointerEnter={() => setDescription(action.label)}
                onFocus={() => setDescription(action.label)}
                onClick={() => {
                  onClose();
                  action.onSelect();
                }}
              >
                {action.icon}
              </IconButton>
            ))}
          </div>
        </div>
        <p id={hintId} className="mt-3 min-h-5 text-footnote text-label-secondary">
          {description}
        </p>
      </Popover>
    </div>,
    document.body,
  );
}
