import { Link } from "@tanstack/react-router";
import { cn, SettingsIcon } from "@ultrapeach/ui";
import { t } from "../../../i18n/i18n";
import { useAuthorName } from "../../../platform/author-preferences";

export function SidebarProfileRow({ active }: { active: boolean }) {
  const name = useAuthorName();
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-t border-separator/60 px-1.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-subheadline font-semibold text-accent-text">
        {(name || "N").slice(0, 1).toUpperCase()}
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span className="truncate text-subheadline font-medium">
          {name || t("nav.onThisDevice")}
        </span>
        <span className="truncate text-caption text-label-tertiary">{t("nav.noAccount")}</span>
      </span>
      <Link
        to="/settings"
        aria-label={t("common.settings")}
        data-tooltip={t("common.settings")}
        className={cn(
          "flex size-8 items-center justify-center rounded-2xl transition-colors duration-fast",
          active
            ? "bg-accent-soft text-accent-text"
            : "text-label-tertiary hover:bg-fill/80 hover:text-label",
        )}
      >
        <SettingsIcon size={18} />
      </Link>
    </div>
  );
}
