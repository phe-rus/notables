import { ChevronRightIcon, type ContextMenuItem, cn, spring, useContextMenu } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Link, type LinkProps } from "@tanstack/react-router";
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
  "group relative isolate flex items-center gap-2.5 rounded-lg px-2.5 py-[6px] text-subheadline text-label no-underline transition-colors duration-fast";

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
    <Button
      variant="ghost"
      type="button"
      onClick={onClick}
      className={cn(
        rowClass,
        "h-auto justify-start text-left font-normal hover:bg-fill/50 [&>span]:w-full [&>span]:justify-start [&>span]:gap-2.5",
      )}
    >
      <span className="flex text-label-secondary">{icon}</span>
      <span className="grow">{children}</span>
      <kbd className="font-sans text-caption text-label-tertiary opacity-0 transition-opacity group-hover:opacity-100">
        {shortcut}
      </kbd>
    </Button>
  );
}

/** A row that folds a few places away under one name, with a turning chevron. */
export function DisclosureRow({
  icon,
  open,
  onToggle,
  controls,
  children,
}: {
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** The id of the list it shows and hides. */
  controls: string;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        rowClass,
        "h-auto justify-start text-left font-normal hover:bg-fill/50 [&>span]:w-full [&>span]:justify-start [&>span]:gap-2.5",
      )}
    >
      <span className="flex text-label-secondary">{icon}</span>
      <span className="grow truncate">{children}</span>
      <motion.span
        className="flex text-label-tertiary rtl:-scale-x-100"
        animate={{ rotate: open ? 90 : 0 }}
        transition={spring.snappy}
      >
        <ChevronRightIcon size={14} />
      </motion.span>
    </Button>
  );
}

const NO_MENU = () => [];

export function NavItem({
  active,
  icon,
  trailing,
  menu,
  tone = "default",
  children,
  ...link
}: LinkProps & {
  active: boolean;
  tone?: "default" | "danger";
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
        tone === "danger" && "bg-danger/8 text-danger hover:bg-danger/12",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-selection"
          className={cn(
            "absolute inset-0 -z-10 rounded-lg",
            tone === "danger" ? "bg-danger/12" : "bg-accent-soft",
          )}
          transition={spring.snappy}
        />
      )}
      <span
        className={cn(
          "flex transition-colors",
          tone === "danger" ? "text-danger" : active ? "text-accent-text" : "text-label-secondary",
        )}
      >
        {icon}
      </span>
      <span className="grow truncate">{children}</span>
      {trailing !== undefined && (
        <span
          className={cn(
            "shrink-0 text-caption tabular-nums",
            tone === "danger" ? "text-danger" : active ? "text-accent-text" : "text-label-tertiary",
          )}
        >
          {trailing}
        </span>
      )}
    </Link>
  );
}
