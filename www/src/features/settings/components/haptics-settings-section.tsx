import { LabeledContent, Section, Toggle } from "@ultrapeach/ui";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { hapticsAvailable, playHaptic } from "../../../platform/haptics";
import { updatePreferences, usePreferences } from "../store/preferences-store";

/** Touch feedback across the app, on devices that can give it. */
export function HapticsSettingsSection() {
  const { haptics } = usePreferences();
  // Known only in the browser, after the page has been prerendered.
  const [available, setAvailable] = useState(false);
  useEffect(() => setAvailable(hapticsAvailable()), []);
  if (!available) return null;

  return (
    <Section title={t("haptics.title")}>
      <LabeledContent label={t("haptics.toggle")} description={t("haptics.hint")}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => playHaptic("success")}
            className="text-subheadline font-medium text-accent-text"
          >
            {t("haptics.tryIt")}
          </button>
          <Toggle
            label={t("haptics.toggle")}
            checked={haptics}
            onChange={(on) => {
              updatePreferences((p) => ({ ...p, haptics: on }));
              // Turning it on answers with a tap, as the system settings do.
              if (on) playHaptic("selection");
            }}
          />
        </div>
      </LabeledContent>
    </Section>
  );
}
