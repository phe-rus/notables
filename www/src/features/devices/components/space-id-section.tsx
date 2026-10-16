import { CopyIcon, IconButton, LabeledContent, Section, toast } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { isTauri } from "../../../platform/runtime";
import { thisDeviceId } from "../../../platform/session/this-device";
import { useSpace } from "../../../platform/space/space-identity";

/** The space's ID, the same on every device of it, so the person can tell their devices apart from anyone else's. */
export function SpaceIdSection() {
  const space = useSpace();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    if (isTauri()) setDeviceId(thisDeviceId());
  }, []);
  if (!space) return null;

  return (
    <Section title={t("nav.noAccount")} footer={t("devices.spaceFooter")}>
      <LabeledContent label={t("devices.spaceId")} stacked>
        <PrivateId key={space.code} value={space.code} />
      </LabeledContent>
      {deviceId && (
        <LabeledContent label={t("devices.deviceId")} stacked>
          <PrivateId key={deviceId} value={deviceId} />
        </LabeledContent>
      )}
    </Section>
  );
}

function PrivateId({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(t("devices.idCopied"));
    } catch {
      // Clipboard refused (no permission): nothing to undo.
    }
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <span className="break-all font-mono text-subheadline tabular-nums select-all" dir="ltr">
        {revealed ? value : value.replace(/[a-z0-9]/gi, "*")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={revealed}
        onClick={() => setRevealed(!revealed)}
      >
        {t(revealed ? "devices.hideId" : "devices.showId")}
      </Button>
      {revealed && (
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={t("devices.copyId")}
          onClick={() => void copy()}
        >
          <CopyIcon size={16} />
        </IconButton>
      )}
    </div>
  );
}
