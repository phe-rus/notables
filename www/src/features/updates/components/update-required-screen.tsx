import { useEffect, useRef } from "react";
import { AppMark } from "@/components/brand/app-mark";
import { t } from "@/i18n/i18n";
import type { UpdateRequiredScreenProps } from "../model/types";
import { UpdateActions } from "./update-actions";

export function UpdateRequiredScreen({
  version,
  error,
  checking,
  onUpdate,
  onCheck,
}: UpdateRequiredScreenProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-5 overflow-y-auto bg-background px-6 py-[max(2rem,env(safe-area-inset-top))] text-center text-label">
      <AppMark size={64} />
      <div className="max-w-sm space-y-3">
        <h1 ref={heading} className="text-title2 font-semibold" tabIndex={-1}>
          {t("updates.required")}
        </h1>
        <p className="text-callout text-label-secondary">
          {t("updates.requiredHint", { version })}
        </p>
        <p className="text-footnote text-label-tertiary">{t("updates.kept")}</p>
      </div>
      <UpdateActions required checking={checking} onUpdate={onUpdate} onCheck={onCheck} />
      {error && (
        <p role="status" className="max-w-sm text-footnote text-label-secondary">
          {error}
        </p>
      )}
      <a className="text-footnote text-accent-text" href="mailto:support@pherus.org">
        {t("settings.aboutSupport")}
      </a>
    </main>
  );
}
