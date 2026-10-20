import { t } from "@/i18n/i18n";
import { devicePlatform } from "@/platform/device-platform";
import { settingsPlace } from "../lib/permission-settings-place";
import { PermissionRow } from "./permission-row";
import { StepTitle } from "./step-title";

export function PermissionsStep() {
  const device = devicePlatform();
  return (
    <>
      <StepTitle title={t("setup.permissionsTitle")}>
        {t("setup.permissionsBody", { place: settingsPlace(device) })}
      </StepTitle>
      <div className="flex flex-col gap-2.5">
        {(["microphone", "camera", "notifications"] as const).map((kind) => (
          <PermissionRow key={kind} kind={kind} device={device} />
        ))}
      </div>
    </>
  );
}
