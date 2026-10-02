import {
  BookIcon,
  cn,
  InvoiceIcon,
  NoteIcon,
  SearchIcon,
  SettingsIcon,
  spring,
} from "@notables/ui";
import { Link, type LinkProps } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { openSearch } from "../../features/search/store/search-palette";

export type TabId = "notes" | "books" | "invoices" | "settings";

const tabs: Array<{ id: TabId; label: string; icon: ReactNode; link: LinkProps }> = [
  { id: "notes", label: "Notes", icon: <NoteIcon size={22} />, link: { to: "/" } },
  { id: "books", label: "Books", icon: <BookIcon size={22} />, link: { to: "/books" } },
  { id: "invoices", label: "Invoices", icon: <InvoiceIcon size={22} />, link: { to: "/invoices" } },
  {
    id: "settings",
    label: "Settings",
    icon: <SettingsIcon size={22} />,
    link: { to: "/settings" },
  },
];

/**
 * Phones: the main places a thumb's reach away, on a floating glass bar,
 * with Search in the middle. Hidden while a note or document is open.
 */
export function TabBar({ active, className }: { active: TabId; className?: string }) {
  const [notes, books, invoices, settings] = tabs as [
    (typeof tabs)[0],
    (typeof tabs)[0],
    (typeof tabs)[0],
    (typeof tabs)[0],
  ];
  return (
    <nav
      aria-label="Main"
      className={cn(
        "glass-menu fixed inset-x-4 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex items-center rounded-[26px] p-1.5 md:hidden",
        className,
      )}
    >
      <Tab tab={notes} active={active === "notes"} />
      <Tab tab={books} active={active === "books"} />
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search"
        className="mx-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-inverse text-on-inverse shadow-lg transition-transform active:scale-95"
      >
        <SearchIcon size={21} strokeWidth={2.1} />
      </button>
      <Tab tab={invoices} active={active === "invoices"} />
      <Tab tab={settings} active={active === "settings"} />
    </nav>
  );
}

function Tab({ tab, active }: { tab: (typeof tabs)[number]; active: boolean }) {
  return (
    <Link
      {...tab.link}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative isolate flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10px] font-semibold no-underline transition-colors",
        active ? "text-accent-text" : "text-label-tertiary",
      )}
    >
      {active && (
        <motion.span
          layoutId="tab-selection"
          className="absolute inset-0 -z-10 rounded-[20px] bg-accent-soft"
          transition={spring.snappy}
        />
      )}
      {tab.icon}
      {tab.label}
    </Link>
  );
}
