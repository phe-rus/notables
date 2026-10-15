import {
  InvoiceIcon,
  NoteIcon,
  SettingsIcon,
  TabBar as UltraPeachTabBar,
  WalletIcon,
} from "@phe-rus/hino";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { openSearch } from "../../features/search/store/search-palette";
import { t } from "../../i18n/i18n";
import { inBrowserSession } from "../../platform/session/browser-session-store";

export type TabId = "notes" | "wallet" | "invoices" | "settings";

interface AppTab {
  id: TabId;
  readonly label: string;
  icon: ReactNode;
  link: LinkProps;
}

const tabs: AppTab[] = [
  {
    id: "notes",
    get label() {
      return t("nav.notes");
    },
    icon: <NoteIcon size={19} strokeWidth={1.8} />,
    link: { to: "/" },
  },
  {
    id: "wallet",
    get label() {
      return t("wallet.title");
    },
    icon: <WalletIcon size={19} strokeWidth={1.8} />,
    link: { to: "/wallet" },
  },
  {
    id: "invoices",
    get label() {
      return t("nav.invoices");
    },
    icon: <InvoiceIcon size={19} strokeWidth={1.8} />,
    link: { to: "/invoices" },
  },
  {
    id: "settings",
    get label() {
      return t("common.settings");
    },
    icon: <SettingsIcon size={19} strokeWidth={1.8} />,
    link: { to: "/settings" },
  },
];

/** Phones: Notables' main places on the tab bar. Hidden while a document is open. */
export function TabBar({ active, className }: { active: TabId | null; className?: string }) {
  return (
    <UltraPeachTabBar
      // The wallet never reaches a browser (spec 0005, AC-28).
      tabs={inBrowserSession() ? tabs.filter((tab) => tab.id !== "wallet") : tabs}
      active={active}
      label={t("nav.main")}
      search={{ label: t("common.search"), onPress: openSearch }}
      renderLink={(tab, props) => <Link key={tab.id} {...tab.link} {...props} />}
      className={className}
    />
  );
}
