import { cn, IconButton, LayoutIcon, Popover, useDismiss } from "@ultrapeach/ui";
import { useRef, useState } from "react";
import {
  layoutPanels,
  type PageScene,
  type PageSize,
  type PanelLayout,
  pageSizes,
  panelLayoutLabels,
  reshape,
} from "../model/page-scene";

const layouts = Object.keys(panelLayoutLabels) as PanelLayout[];

/** Page shape and panel layout, shown as small previews. */
export function PageMenu({
  scene,
  onChange,
}: {
  scene: PageScene;
  onChange: (scene: PageScene) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(root, open, () => setOpen(false));

  return (
    <div ref={root} className="relative">
      <IconButton
        label="Page and panels"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <LayoutIcon size={19} />
      </IconButton>
      <Popover
        open={open}
        origin="top-left"
        className="top-[calc(100%+8px)] left-1/2 w-[320px] -translate-x-1/2 p-3"
      >
        <p className="px-1 pb-2 text-caption font-semibold text-label-secondary">Page</p>
        <div className="flex flex-wrap gap-1.5 pb-3">
          {(Object.keys(pageSizes) as PageSize[]).map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={scene.size === size}
              onClick={() => onChange(reshape(scene, size, scene.layout))}
              className={cn(
                "rounded-full px-3 py-1.5 text-footnote font-medium transition-colors",
                scene.size === size ? "bg-inverse text-on-inverse" : "bg-fill/60 hover:bg-fill",
              )}
            >
              {pageSizes[size].label}
            </button>
          ))}
        </div>
        <p className="px-1 pb-2 text-caption font-semibold text-label-secondary">Panels</p>
        <div className="grid grid-cols-3 gap-2">
          {layouts.map((layout) => (
            <button
              key={layout}
              type="button"
              aria-pressed={scene.layout === layout}
              onClick={() => onChange(reshape(scene, scene.size, layout))}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl p-1.5 transition-colors",
                scene.layout === layout ? "bg-accent/15 text-accent-text" : "hover:bg-fill/60",
              )}
            >
              <LayoutPreview layout={layout} width={scene.width} height={scene.height} />
              <span className="text-caption2 font-medium">{panelLayoutLabels[layout]}</span>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function LayoutPreview({
  layout,
  width,
  height,
}: {
  layout: PanelLayout;
  width: number;
  height: number;
}) {
  const panels = layoutPanels(layout, width, height);
  return (
    <svg
      data-brand
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-auto rounded-xs bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.12)]"
      aria-hidden
    >
      {panels.map((panel) => (
        <rect
          key={panel.id}
          x={panel.x}
          y={panel.y}
          width={panel.w}
          height={panel.h}
          fill="none"
          stroke="#141210"
          strokeWidth={width / 60}
        />
      ))}
    </svg>
  );
}
