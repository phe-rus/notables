import { useEffect, useState } from "react";
import { t } from "@/i18n/i18n";
import { useAppUpdates } from "../hooks/use-app-updates";
import { useUpdateAction } from "../hooks/use-update-action";
import { startAppUpdates } from "../lib/start-app-updates";
import type { AppUpdateBoundaryProps } from "../model/types";
import { appUpdateStore } from "../store/app-update-store";
import { UpdateAvailableDialog } from "./update-available-dialog";
import { UpdateRequiredScreen } from "./update-required-screen";

export function AppUpdateBoundary({ children }: AppUpdateBoundaryProps) {
  useEffect(startAppUpdates, []);
  const state = useAppUpdates();
  const { openFailed, update } = useUpdateAction();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const release = state.release;
  if (!release) return children;
  const identity = `${release.version}:${release.build}`;
  const dismiss = () => setDismissed(identity);
  if (state.required)
    return (
      <UpdateRequiredScreen
        version={release.version}
        checking={state.checking}
        error={
          openFailed || state.failed
            ? t(openFailed ? "updates.openFailed" : "updates.checkFailed")
            : null
        }
        onUpdate={() => void update()}
        onCheck={() => void appUpdateStore.check()}
      />
    );
  return (
    <>
      {children}
      <UpdateAvailableDialog
        open={dismissed !== identity}
        version={release.version}
        deadline={state.deadline ?? 0}
        openFailed={openFailed}
        onUpdate={() => void update()}
        onDismiss={dismiss}
        onOpenChange={(open) => {
          if (!open) dismiss();
        }}
      />
    </>
  );
}
