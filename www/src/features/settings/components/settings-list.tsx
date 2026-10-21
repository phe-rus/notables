import { ChevronRightIcon, cn } from "@phe-rus/hino";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { t } from "@/i18n/i18n";
import { useAuthorName } from "@/platform/author-preferences";
import { isTauri } from "@/platform/runtime";
import { useSpace } from "@/platform/space/space-identity";
import { useSpaceDevices } from "@/platform/space/use-space-devices";
import { type SettingsPageId, settingsGroups, settingsPages } from "./settings-catalog";

const row =
  "relative flex min-h-11 items-center gap-2.5 px-3 py-1.5 no-underline transition-colors hover:bg-fill/50 active:bg-fill";

/**
 * The Settings list, as iOS draws it: who you are at the top, then grouped
 * rows, each with a round icon in the person's accent color. On wide
 * screens it stays beside the open page and marks it.
 */
export function SettingsList({ current }: { current: SettingsPageId | null }) {
  const name = useAuthorName();
  const space = useSpace();
  const devices = useSpaceDevices();
  // Which pages a device has (haptics, widgets) is known only once running.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const shown = (id: SettingsPageId) => {
    if (
      ready &&
      isTauri() &&
      ["sidebar", "listening", "reminders", "haptics", "widgets"].includes(id)
    )
      return false;
    const check = settingsPages[id].available;
    return !check || (ready && check());
  };
  return (
    <nav aria-label={t("settings.title")} className="flex flex-col gap-5">
      <Link
        to="/settings/$page"
        params={{ page: "profile" }}
        aria-current={current === "profile" ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-2xl bg-background px-3 py-2.5 no-underline transition-colors hover:bg-fill/40",
          current === "profile" && "bg-accent-soft hover:bg-accent-soft",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-subheadline font-semibold text-on-accent">
          {(name.trim()[0] ?? "N").toUpperCase()}
        </span>
        <span className="flex min-w-0 grow flex-col">
          <span className="truncate text-subheadline font-semibold text-label">
            {name || t("nav.onThisDevice")}
          </span>
          <span className="truncate text-caption text-label-secondary">{t("nav.noAccount")}</span>
          {space && (
            <span className="font-mono text-caption text-label-tertiary" dir="ltr">
              {space.code.replace(/[A-Z0-9]/g, "*")}
            </span>
          )}
        </span>
        <ChevronRightIcon size={16} className="text-label-tertiary rtl:-scale-x-100" />
      </Link>
      {settingsGroups.map((group) => {
        const ids = group.pages.filter(shown);
        if (ids.length === 0) return null;
        return (
          <section
            key={group.pages.join()}
            aria-label={group.title()}
            className="flex flex-col gap-1.5"
          >
            <h2 className="px-3 text-caption font-medium text-label-secondary">{group.title()}</h2>
            <div className="flex flex-col overflow-hidden rounded-2xl bg-background">
              {ids.map((id) => {
                const page = settingsPages[id];
                const active = current === id;
                return (
                  <Link
                    key={id}
                    to="/settings/$page"
                    params={{ page: id }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      row,
                      "after:absolute after:inset-x-3 after:bottom-0 after:ms-9 after:h-px after:bg-separator/60 last:after:hidden",
                      active && "bg-accent-soft hover:bg-accent-soft",
                    )}
                  >
                    <span className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent">
                      {page.icon}
                    </span>
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate text-subheadline text-label">{page.title}</span>
                    </span>
                    {id === "connected-devices" && devices.length > 0 && (
                      <span className="text-caption tabular-nums text-label-secondary">
                        {devices.length}
                      </span>
                    )}
                    <ChevronRightIcon size={16} className="text-label-tertiary rtl:-scale-x-100" />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}
