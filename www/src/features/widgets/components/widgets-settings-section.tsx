import { Switch } from "@notables/ui";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { devicePlatform } from "../../../platform/device-platform";
import { isTauri } from "../../../platform/runtime";
import { SettingsGroup, SettingsRow } from "../../settings/components/settings-controls";
import { desktopWidgetWanted, setDesktopWidget, supportsDesktopWidget } from "../lib/widget-bridge";

/** The desktop widget switch, or where to find widgets on this device. */
export function WidgetsSettingsSection() {
  const [on, setOn] = useState(desktopWidgetWanted);
  const { os } = devicePlatform();
  const phone = isTauri() && (os === "ios" || os === "android");

  return (
    <SettingsGroup
      title={t("widgets.title")}
      footer={
        phone ? t("widgets.phoneHint") : supportsDesktopWidget() ? undefined : t("widgets.webHint")
      }
    >
      {supportsDesktopWidget() ? (
        <SettingsRow label={t("widgets.desktop")} description={t("widgets.desktopHint")}>
          <Switch
            label={t("widgets.desktop")}
            checked={on}
            onChange={(next) => {
              setOn(next);
              void setDesktopWidget(next).catch(() => setOn(false));
            }}
          />
        </SettingsRow>
      ) : (
        <SettingsRow label={t("widgets.preview")} description={t("widgets.previewHint")}>
          <a
            href="/widget"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-medium text-accent-text"
          >
            {t("common.open")}
          </a>
        </SettingsRow>
      )}
    </SettingsGroup>
  );
}
