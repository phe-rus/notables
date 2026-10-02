import { cn, DragHandleIcon, HiddenIcon, VisibleIcon } from "@notables/ui";
import { Reorder, useDragControls } from "motion/react";
import type { ReactNode } from "react";
import { updatePreferences, usePreferences } from "../../settings/store/preferences-store";
import { type SidebarItemId, sidebarItemTitles } from "../model/sidebar-items";

/**
 * Reorder sidebar items by dragging and show or hide each one. Used in the
 * sidebar's edit mode and in Settings.
 */
export function SidebarEditor({
  icons,
  className,
}: {
  icons: Record<SidebarItemId, ReactNode>;
  className?: string;
}) {
  const { order, hidden } = usePreferences().sidebar;

  const reorder = (next: SidebarItemId[]) =>
    updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, order: next } }));
  const toggle = (id: SidebarItemId) =>
    updatePreferences((p) => ({
      ...p,
      sidebar: {
        ...p.sidebar,
        hidden: p.sidebar.hidden.includes(id)
          ? p.sidebar.hidden.filter((h) => h !== id)
          : [...p.sidebar.hidden, id],
      },
    }));

  return (
    <Reorder.Group
      axis="y"
      values={order}
      onReorder={reorder}
      className={cn("flex flex-col gap-0.5", className)}
    >
      {order.map((id) => (
        <EditorRow
          key={id}
          id={id}
          icon={icons[id]}
          visible={!hidden.includes(id)}
          onToggle={() => toggle(id)}
        />
      ))}
    </Reorder.Group>
  );
}

function EditorRow({
  id,
  icon,
  visible,
  onToggle,
}: {
  id: SidebarItemId;
  icon: ReactNode;
  visible: boolean;
  onToggle: () => void;
}) {
  const controls = useDragControls();
  const title = sidebarItemTitles[id];
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="relative flex items-center gap-2.5 rounded-lg bg-transparent px-1.5 py-[5px] text-[14px]"
      whileDrag={{
        scale: 1.02,
        backgroundColor: "var(--color-elevated)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <button
        type="button"
        aria-label={`Move ${title}`}
        onPointerDown={(event) => controls.start(event)}
        className="flex cursor-grab touch-none p-1 text-label-tertiary active:cursor-grabbing"
      >
        <DragHandleIcon size={15} />
      </button>
      <span className={cn("flex", visible ? "text-label-secondary" : "text-label-tertiary/60")}>
        {icon}
      </span>
      <span className={cn("grow truncate", !visible && "text-label-tertiary line-through")}>
        {title}
      </span>
      <button
        type="button"
        aria-label={visible ? `Hide ${title}` : `Show ${title}`}
        aria-pressed={visible}
        onClick={onToggle}
        className="flex rounded-md p-1 text-label-tertiary transition-colors hover:bg-fill hover:text-label"
      >
        {visible ? <VisibleIcon size={16} /> : <HiddenIcon size={16} />}
      </button>
    </Reorder.Item>
  );
}
