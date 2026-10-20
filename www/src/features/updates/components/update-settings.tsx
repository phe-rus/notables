import { LabeledContent, Section } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { openExternalUrl } from "../../../platform/external-links";
import { isTauri } from "../../../platform/runtime";
import { checkAppUpdates, updateDestination, useAppUpdates } from "../lib/app-updates";

export function UpdateSettings() {
  const state = useAppUpdates();
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!isTauri() || import.meta.env.DEV) return null;
  return (
    <Section
      title={t("updates.title")}
      footer={
        failed
          ? t("updates.openFailed")
          : checked
            ? t(
                state.failed
                  ? "updates.checkFailed"
                  : state.release
                    ? "updates.available"
                    : state.installed
                      ? "updates.current"
                      : "updates.unavailable",
              )
            : t("updates.hint")
      }
    >
      <LabeledContent label={t("updates.check")}>
        <Button
          size="sm"
          variant="ghost"
          isPending={state.checking}
          onClick={async () => {
            await checkAppUpdates();
            setChecked(true);
          }}
        >
          {t("updates.check")}
        </Button>
      </LabeledContent>
      {state.release && (
        <LabeledContent label={t("settings.version", { version: state.release.version })}>
          <Button
            size="sm"
            onClick={async () => {
              const url = updateDestination();
              if (!url) return;
              setFailed(false);
              try {
                await openExternalUrl(url);
              } catch {
                setFailed(true);
              }
            }}
          >
            {t("updates.update")}
          </Button>
        </LabeledContent>
      )}
    </Section>
  );
}
