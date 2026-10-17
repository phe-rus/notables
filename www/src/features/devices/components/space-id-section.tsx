import {
  CopyIcon,
  IconButton,
  LabeledContent,
  MoreIcon,
  openMenu,
  Section,
  toast,
} from "@phe-rus/hino";
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
    <Section title={t("devices.identifiers")} footer={t("devices.identifiersHint")}>
      <LabeledContent label={t("devices.spaceId")}>
        <PrivateId key={space.code} value={space.code} />
      </LabeledContent>
      {deviceId && (
        <LabeledContent label={t("devices.deviceId")}>
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
    <div className="flex min-w-0 items-center justify-end gap-1">
      <span
        className="max-w-[min(38vw,280px)] truncate font-mono text-caption text-label-secondary select-all"
        dir="ltr"
        title={revealed ? value : undefined}
      >
        {revealed ? value : "•••• •••• ••••"}
      </span>
      <IconButton
        size="icon-xs"
        variant="ghost"
        label={t("devices.identifiers")}
        onClick={(event) =>
          openMenu(
            event.currentTarget,
            [
              {
                label: t(revealed ? "devices.hideId" : "devices.showId"),
                onSelect: () => setRevealed(!revealed),
              },
              {
                label: t("devices.copyId"),
                icon: <CopyIcon size={16} />,
                onSelect: () => void copy(),
              },
            ],
            { edge: "trailing" },
          )
        }
      >
        <MoreIcon size={16} />
      </IconButton>
    </div>
  );
}
