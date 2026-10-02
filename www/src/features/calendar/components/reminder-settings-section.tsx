import { Switch } from "@notables/ui";
import { useEffect, useState } from "react";
import {
  type PermissionState,
  permissionState,
  requestPermission,
} from "../../../platform/permissions";
import { SettingsGroup, SettingsRow } from "../../settings/components/settings-controls";
import { alertFeedback } from "../lib/alert-feedback";
import { setAlertSettings, useAlertSettings } from "../lib/alert-settings";

const permissionWords: Record<PermissionState, string> = {
  granted: "Allowed",
  denied: "Turned off in system settings",
  prompt: "Not asked yet",
  unsupported: "Not available here",
};

/** How calendar reminders reach you on this device. */
export function ReminderSettingsSection() {
  const { sound, haptics } = useAlertSettings();
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    void permissionState("notifications").then(setPermission);
  }, []);

  return (
    <SettingsGroup
      title="Reminders"
      footer="Reminders from your calendar. Phones deliver them even when Notables is closed; on computers and in the browser, Notables needs to be open."
    >
      <SettingsRow
        label="Notifications"
        description={permission ? permissionWords[permission] : " "}
      >
        {permission === "prompt" ? (
          <button
            type="button"
            onClick={() => void requestPermission("notifications").then(setPermission)}
            className="text-[14px] font-medium text-accent-text"
          >
            Allow
          </button>
        ) : (
          <button
            type="button"
            onClick={alertFeedback}
            className="text-[14px] font-medium text-accent-text"
          >
            Try it
          </button>
        )}
      </SettingsRow>
      <SettingsRow label="Sound" description="A soft chime when a reminder goes off.">
        <Switch label="Sound" checked={sound} onChange={(on) => setAlertSettings({ sound: on })} />
      </SettingsRow>
      <SettingsRow label="Vibrate" description="On devices that can.">
        <Switch
          label="Vibrate"
          checked={haptics}
          onChange={(on) => setAlertSettings({ haptics: on })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
