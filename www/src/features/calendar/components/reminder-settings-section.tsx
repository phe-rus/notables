import { LabeledContent, Section, Toggle } from "@ultrapeach/ui";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import {
  type PermissionState,
  permissionState,
  requestPermission,
} from "../../../platform/permissions";
import { alertFeedback } from "../lib/alert-feedback";
import { setAlertSettings, useAlertSettings } from "../lib/alert-settings";

const permissionWords = (state: PermissionState): string =>
  ({
    granted: t("reminders.permissionGranted"),
    denied: t("reminders.permissionDenied"),
    prompt: t("reminders.permissionPrompt"),
    unsupported: t("reminders.permissionUnsupported"),
  })[state];

/** How calendar reminders reach you on this device. */
export function ReminderSettingsSection() {
  const { sound, haptics } = useAlertSettings();
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    void permissionState("notifications").then(setPermission);
  }, []);

  return (
    <Section title={t("reminders.title")} footer={t("reminders.footer")}>
      <LabeledContent
        label={t("reminders.notifications")}
        description={permission ? permissionWords(permission) : " "}
      >
        {permission === "prompt" ? (
          <button
            type="button"
            onClick={() => void requestPermission("notifications").then(setPermission)}
            className="text-[14px] font-medium text-accent-text"
          >
            {t("common.allow")}
          </button>
        ) : (
          <button
            type="button"
            onClick={alertFeedback}
            className="text-[14px] font-medium text-accent-text"
          >
            {t("reminders.tryIt")}
          </button>
        )}
      </LabeledContent>
      <LabeledContent label={t("reminders.sound")} description={t("reminders.soundHint")}>
        <Toggle
          label={t("reminders.sound")}
          checked={sound}
          onChange={(on) => setAlertSettings({ sound: on })}
        />
      </LabeledContent>
      <LabeledContent label={t("reminders.vibrate")} description={t("reminders.vibrateHint")}>
        <Toggle
          label={t("reminders.vibrate")}
          checked={haptics}
          onChange={(on) => setAlertSettings({ haptics: on })}
        />
      </LabeledContent>
    </Section>
  );
}
