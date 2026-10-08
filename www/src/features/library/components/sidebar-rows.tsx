import { Link, type LinkProps } from "@tanstack/react-router";
import { type ContextMenuItem, cn, spring, useContextMenu } from "@ultrapeach/ui";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex h-7 items-center justify-between pr-1 pl-2.5">
      <span className="text-caption font-medium text-label-tertiary">{title}</span>
      {action}
    </div>
  );
}

const rowClass =
  "group relative isolate flex items-center gap-2.5 rounded-md px-2.5 py-[6px] text-[14px] text-label no-underline transition-colors duration-fast";

export function ActionRow({
  icon,
  shortcut,
  onClick,
  children,
}: {
  icon: ReactNode;
  shortcut: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(rowClass, "text-left hover:bg-fill/70")}>
      <span className="flex text-label-secondary">{icon}</span>
      <span className="grow">{children}</span>
      <kbd className="font-sans text-caption text-label-tertiary opacity-0 transition-opacity group-hover:opacity-100">
        {shortcut}
      </kbd>
    </button>
  );
}

const NO_MENU = () => [];

export function NavItem({
  active,
  icon,
  trailing,
  menu,
  children,
  ...link
}: LinkProps & {
  active: boolean;
  icon: ReactNode;
  trailing?: ReactNode;
  /** Actions for right-click and long-press. */
  menu?: () => ContextMenuItem[];
  children: ReactNode;
}) {
  const handlers = useContextMenu(menu ?? NO_MENU);
  return (
    <Link
      {...link}
      {...(menu ? handlers : {})}
      className={cn(
        rowClass,
        "touch-manipulation [-webkit-touch-callout:none]",
        active ? "font-medium" : "hover:bg-fill/70",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-selection"
          className="absolute inset-0 -z-10 rounded-md bg-accent-soft"
          transition={spring.snappy}
        />
      )}
      <span
        className={cn(
          "flex transition-colors",
          active ? "text-accent-text" : "text-label-secondary",
        )}
      >
        {icon}
      </span>
      <span className="grow truncate">{children}</span>
      {trailing !== undefined && (
        <span
          className={cn(
            "shrink-0 text-caption tabular-nums",
            active ? "text-accent-text" : "text-label-tertiary",
          )}
        >
          {trailing}
        </span>
      )}
    </Link>
  );
}
