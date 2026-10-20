import { AiSettingsSection } from "@/features/ai/components/ai-settings-section";
import { t } from "@/i18n/i18n";
import { StepTitle } from "./step-title";

export function AiStep() {
  return (
    <>
      <StepTitle title={t("setup.aiTitle")}>{t("setup.aiBody")}</StepTitle>
      <AiSettingsSection />
    </>
  );
}
