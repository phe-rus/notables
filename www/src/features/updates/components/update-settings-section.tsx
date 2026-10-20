import { LabeledContent, Section } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useState } from "react";
import { t } from "@/i18n/i18n";
import { isTauri } from "@/platform/runtime";
import { useAppUpdates } from "../hooks/use-app-updates";
import { useUpdateAction } from "../hooks/use-update-action";
import { appUpdateStore } from "../store/app-update-store";

export function UpdateSettingsSection() {
  const state = useAppUpdates();
  const { openFailed, update } = useUpdateAction();
  const [checked, setChecked] = useState(false);
  if (!isTauri() || import.meta.env.DEV) return null;
  const message = openFailed
    ? "updates.openFailed"
    : !checked
      ? "updates.hint"
      : state.failed
        ? "updates.checkFailed"
        : state.release
          ? "updates.available"
          : state.installed
            ? "updates.current"
            : "updates.unavailable";
  return (
    <Section title={t("updates.title")} footer={t(message)}>
      <LabeledContent label={t("updates.check")}>
        <Button
          size="sm"
          variant="ghost"
          isPending={state.checking}
          onClick={async () => {
            await appUpdateStore.check();
            setChecked(true);
          }}
        >
          {t("updates.check")}
        </Button>
      </LabeledContent>
      {state.release && (
        <LabeledContent label={t("settings.version", { version: state.release.version })}>
          <Button size="sm" onClick={() => void update()}>
            {t("updates.update")}
          </Button>
        </LabeledContent>
      )}
    </Section>
  );
}
