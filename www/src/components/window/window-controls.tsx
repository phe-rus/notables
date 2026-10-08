import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@ultrapeach/ui";

const buttons = [
  { action: "close", label: "Close", color: "bg-[#ff5f57]", glyph: "M4 4l4 4M8 4l-4 4" },
  { action: "minimize", label: "Minimize", color: "bg-[#febc2e]", glyph: "M3.5 6h5" },
  { action: "maximize", label: "Zoom", color: "bg-[#28c840]", glyph: "M4 8V4h4M8 4v4H4" },
] as const;

/**
 * Close, minimize and zoom for undecorated windows on Windows and Linux,
 * drawn in the same quiet style as macOS so the app feels the same
 * everywhere. Glyphs appear while the pointer is over the group.
 */
export function WindowControls({ className }: { className?: string }) {
  const run = (action: (typeof buttons)[number]["action"]) => {
    const window = getCurrentWindow();
    if (action === "close") void window.close();
    else if (action === "minimize") void window.minimize();
    else void window.toggleMaximize();
  };

  return (
    <div className={cn("group/controls flex items-center gap-2", className)}>
      {buttons.map((button) => (
        <button
          key={button.action}
          type="button"
          aria-label={button.label}
          onClick={() => run(button.action)}
          className={cn(
            "flex size-3 items-center justify-center rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)] transition-[filter] active:brightness-90",
            button.color,
          )}
        >
          <svg
            viewBox="0 0 12 12"
            className="size-2 opacity-0 transition-opacity duration-fast group-hover/controls:opacity-100"
            fill="none"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="1.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d={button.glyph} />
          </svg>
        </button>
      ))}
    </div>
  );
}
