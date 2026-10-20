import { ChevronLeftIcon } from "@phe-rus/hino";
import { Link } from "@tanstack/react-router";
import { t } from "@/i18n/i18n";

/** Workspace destinations return home directly, regardless of how they were opened. */
export function WorkspaceBackLink() {
  return (
    <Link
      to="/"
      search={{}}
      aria-label={t("nav.workspace")}
      data-tooltip={t("nav.workspace")}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-accent-text md:hidden"
    >
      <ChevronLeftIcon size={22} className="rtl:-scale-x-100" />
    </Link>
  );
}
