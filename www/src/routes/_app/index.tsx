import { createFileRoute } from "@tanstack/react-router";
import { t } from "../../i18n/i18n";

export const Route = createFileRoute("/_app/")({
  component: NoNoteSelected,
});

function NoNoteSelected() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="font-serif text-title2 font-semibold text-label">{t("notes.emptyTitle")}</p>
      <p className="text-subheadline text-label-secondary">{t("notes.emptyBody")}</p>
    </div>
  );
}
