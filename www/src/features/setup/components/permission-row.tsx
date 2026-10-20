import { CheckIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useEffect, useState } from "react";
import { t } from "@/i18n/i18n";
import { type PermissionState, permissionState, requestPermission } from "@/platform/permissions";
import { permissionCopy } from "../lib/permission-copy";
import { settingsPlace } from "../lib/permission-settings-place";
import type { PermissionRowProps } from "../model/types";

export function PermissionRow({ kind, device }: PermissionRowProps) {
  const [state, setState] = useState<PermissionState | "asking">("prompt");
  useEffect(() => {
    void permissionState(kind).then(setState);
  }, [kind]);
  const copy = permissionCopy(kind);
  const ask = async () => {
    setState("asking");
    setState(await requestPermission(kind));
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-separator/60 bg-elevated p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
        {copy.icon}
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-subheadline font-semibold">{copy.title}</span>
        <span className="text-footnote leading-snug text-label-secondary">
          {state === "denied"
            ? t("setup.permissionDenied", { place: settingsPlace(device) })
            : state === "unsupported"
              ? t("common.notAvailable")
              : copy.body}
        </span>
      </span>
      {state === "granted" ? (
        <span className="flex items-center gap-1 shrink-0 text-footnote font-medium text-success">
          <CheckIcon size={16} strokeWidth={2.6} />
          {t("common.allowed")}
        </span>
      ) : state === "prompt" || state === "asking" ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={state === "asking"}
          onClick={() => void ask()}
        >
          {state === "asking" ? t("common.asking") : t("common.allow")}
        </Button>
      ) : null}
    </div>
  );
}
