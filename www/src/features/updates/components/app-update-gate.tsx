import { Button } from "@phe-rus/hino/button";
import { Dialog } from "@phe-rus/hino/dialog";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { t } from "../../../i18n/i18n";
import { openExternalUrl } from "../../../platform/external-links";
import {
  checkAppUpdates,
  startAppUpdates,
  updateDestination,
  useAppUpdates,
} from "../lib/app-updates";

export function AppUpdateGate({ children }: { children: ReactNode }) {
  useEffect(startAppUpdates, []);
  const state = useAppUpdates();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [openFailed, setOpenFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (state.required) heading.current?.focus();
  }, [state.required]);
  const release = state.release;
  const identity = release ? `${release.version}:${release.build}` : null;
  const update = async () => {
    const destination = updateDestination();
    if (!destination) return;
    setOpenFailed(false);
    try {
      await openExternalUrl(destination);
    } catch {
      setOpenFailed(true);
    }
  };
  const actions = (
    <div className="flex flex-wrap justify-center gap-2">
      <Button size="sm" onClick={() => void update()}>
        {t("updates.update")}
      </Button>
      {state.required ? (
        <Button
          size="sm"
          variant="ghost"
          isPending={state.checking}
          onClick={() => void checkAppUpdates()}
        >
          {t("updates.checkAgain")}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setDismissed(identity)}>
          {t("updates.later")}
        </Button>
      )}
    </div>
  );
  if (state.required && release)
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-5 overflow-y-auto bg-background px-6 py-[max(2rem,env(safe-area-inset-top))] text-center text-label">
        <AppMark size={64} />
        <div className="max-w-sm space-y-3">
          <h1 ref={heading} className="text-title2 font-semibold" tabIndex={-1}>
            {t("updates.required")}
          </h1>
          <p className="text-callout text-label-secondary">
            {t("updates.requiredHint", { version: release.version })}
          </p>
          <p className="text-footnote text-label-tertiary">{t("updates.kept")}</p>
        </div>
        {actions}
        {(openFailed || state.failed) && (
          <p role="status" className="max-w-sm text-footnote text-label-secondary">
            {t(openFailed ? "updates.openFailed" : "updates.checkFailed")}
          </p>
        )}
        <a className="text-footnote text-accent-text" href="mailto:support@pherus.org">
          {t("settings.aboutSupport")}
        </a>
      </main>
    );
  return (
    <>
      {children}
      <Dialog
        open={Boolean(release && dismissed !== identity)}
        onOpenChange={(open) => {
          if (!open) setDismissed(identity);
        }}
        title={t("updates.available")}
        footer={actions}
      >
        {release && (
          <p className="text-callout text-label-secondary">
            {t("updates.availableHint", {
              version: release.version,
              date: new Date(state.deadline ?? 0).toLocaleDateString(
                document.documentElement.lang,
                { month: "short", day: "numeric" },
              ),
            })}
          </p>
        )}
        {openFailed && (
          <p role="status" className="text-footnote text-danger">
            {t("updates.openFailed")}
          </p>
        )}
      </Dialog>
    </>
  );
}
