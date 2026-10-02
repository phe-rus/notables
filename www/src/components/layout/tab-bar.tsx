import { BookIcon, cn, InvoiceIcon, NoteIcon, SearchIcon, SettingsIcon } from "@notables/ui";
import { Link, type LinkProps } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { openSearch } from "../../features/search/store/search-palette";

export type TabId = "notes" | "books" | "invoices" | "settings";

const tabs: Array<{ id: TabId; label: string; icon: ReactNode; link: LinkProps }> = [
  {
    id: "notes",
    label: "Notes",
    icon: <NoteIcon size={21} strokeWidth={1.8} />,
    link: { to: "/" },
  },
  {
    id: "books",
    label: "Books",
    icon: <BookIcon size={21} strokeWidth={1.8} />,
    link: { to: "/books" },
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: <InvoiceIcon size={21} strokeWidth={1.8} />,
    link: { to: "/invoices" },
  },
  {
    id: "settings",
    label: "Settings",
    icon: <SettingsIcon size={21} strokeWidth={1.8} />,
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
        // A compact island, sized by its tabs rather than stretched edge to edge.
        "glass-menu fixed bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5 md:hidden",
        className,
      )}
    >
      <Tab tab={notes} active={active === "notes"} />
      <Tab tab={books} active={active === "books"} />
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search"
        className="mx-0.5 flex size-[52px] shrink-0 items-center justify-center rounded-full bg-inverse text-on-inverse shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_4px_12px_-4px_rgb(0_0_0/0.4)] transition-transform duration-fast active:scale-[0.92]"
      >
        <SearchIcon size={22} strokeWidth={2} />
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
        "relative isolate flex h-[52px] w-[60px] flex-col items-center justify-center gap-[3px] rounded-full text-[10px] font-semibold tracking-[0.01em] no-underline transition-[color,transform] duration-fast active:scale-[0.94]",
        active ? "text-accent-text" : "text-label-tertiary",
      )}
    >
      {active && (
        <motion.span
          layoutId="tab-selection"
          className="absolute inset-0 -z-10 rounded-full bg-accent-soft"
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
        />
      )}
      {tab.icon}
      {tab.label}
    </Link>
  );
}
