import { Link } from "@tanstack/react-router";
import { accents } from "@ultrapeach/tokens";
import { ChevronRightIcon, cn } from "@ultrapeach/ui";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { useAuthorName } from "../../../platform/author-preferences";
import { type SettingsPageId, settingsGroups, settingsPages } from "./settings-catalog";

/** Every page shares one tile color, the Appearance lavender, so the list reads as one set. */
const tileColor = accents.lavender.light.accentText;

const row =
  "flex min-h-12 items-center gap-3 px-3.5 py-2 no-underline transition-colors hover:bg-fill/50 active:bg-fill";

/**
 * The Settings list, as iOS draws it: who you are at the top, then grouped
 * rows, each with a colored icon tile. On wide screens it stays beside the
 * open page and marks it.
 */
export function SettingsList({ current }: { current: SettingsPageId | null }) {
  const name = useAuthorName();
  // Which pages a device has (haptics, widgets) is known only once running.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const shown = (id: SettingsPageId) => {
    const check = settingsPages[id].available;
    return !check || (ready && check());
  };
  return (
    <nav aria-label={t("settings.title")} className="flex flex-col gap-6">
      <Link
        to="/settings/$page"
        params={{ page: "profile" }}
        aria-current={current === "profile" ? "page" : undefined}
        className={cn(
          "flex items-center gap-3.5 rounded-3xl border border-separator/60 bg-elevated px-3.5 py-3 no-underline transition-colors hover:bg-fill/40",
          current === "profile" && "bg-accent-soft hover:bg-accent-soft",
        )}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-title3 font-semibold text-on-accent">
          {(name.trim()[0] ?? "N").toUpperCase()}
        </span>
        <span className="flex min-w-0 grow flex-col">
          <span className="truncate text-headline font-semibold text-label">
            {name || t("nav.onThisDevice")}
          </span>
          <span className="truncate text-footnote text-label-secondary">{t("nav.noAccount")}</span>
        </span>
        <ChevronRightIcon size={16} className="text-label-tertiary rtl:-scale-x-100" />
      </Link>
      {settingsGroups.map((group) => {
        const ids = group.filter(shown);
        if (ids.length === 0) return null;
        return (
          <div
            key={group.join()}
            className="flex flex-col divide-y divide-separator/60 overflow-hidden rounded-3xl border border-separator/60 bg-elevated"
          >
            {ids.map((id) => {
              const page = settingsPages[id];
              const active = current === id;
              return (
                <Link
                  key={id}
                  to="/settings/$page"
                  params={{ page: id }}
                  aria-current={active ? "page" : undefined}
                  className={cn(row, active && "bg-accent-soft hover:bg-accent-soft")}
                >
                  <span
                    className="flex size-[30px] shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: tileColor }}
                  >
                    {page.icon}
                  </span>
                  <span className="grow truncate text-body text-label">{page.title}</span>
                  <ChevronRightIcon size={16} className="text-label-tertiary rtl:-scale-x-100" />
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
