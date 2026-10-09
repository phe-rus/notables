import { LabeledContent, Section, Toggle } from "@ultrapeach/ui";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { androidBridge } from "../../../platform/android-bridge";
import { devicePlatform } from "../../../platform/device-platform";
import { isTauri } from "../../../platform/runtime";
import { desktopWidgetWanted, setDesktopWidget, supportsDesktopWidget } from "../lib/widget-bridge";

/** The desktop widget switch, the home-screen widget, or where to find widgets. */
export function WidgetsSettingsSection() {
  const [on, setOn] = useState(desktopWidgetWanted);
  // Known only in the app, after the page has been prerendered.
  const [canPin, setCanPin] = useState(false);
  useEffect(() => setCanPin(androidBridge()?.canPinWidget() ?? false), []);
  const { os } = devicePlatform();
  const phone = isTauri() && (os === "ios" || os === "android");

  const row = supportsDesktopWidget() ? (
    <LabeledContent label={t("widgets.desktop")} description={t("widgets.desktopHint")}>
      <Toggle
        label={t("widgets.desktop")}
        checked={on}
        onChange={(next) => {
          setOn(next);
          void setDesktopWidget(next).catch(() => setOn(false));
        }}
      />
    </LabeledContent>
  ) : canPin ? (
    // Android offers the widget itself: the system sheet places it on the home screen.
    <LabeledContent label={t("widgets.addToHome")} description={t("widgets.addToHomeHint")}>
      <button
        type="button"
        onClick={() => androidBridge()?.pinWidget()}
        className="text-subheadline font-medium text-accent-text"
      >
        {t("common.add")}
      </button>
    </LabeledContent>
  ) : phone ? null : (
    <LabeledContent label={t("widgets.preview")} description={t("widgets.previewHint")}>
      <a
        href="/widget"
        target="_blank"
        rel="noreferrer"
        className="text-subheadline font-medium text-accent-text"
      >
        {t("common.open")}
      </a>
    </LabeledContent>
  );

  return (
    <Section
      title={t("widgets.title")}
      footer={
        phone ? t("widgets.phoneHint") : supportsDesktopWidget() ? undefined : t("widgets.webHint")
      }
    >
      {row}
    </Section>
  );
}
