import { Button, confirmDialog, Sheet, Switch, toast } from "@notables/ui";
import { useState } from "react";
import { locale, type MessageKey, t } from "../../../i18n/i18n";
import { SettingsGroup, SettingsRow } from "../../settings/components/settings-controls";
import {
  deletePack,
  downloadPack,
  type PackStatus,
  packLicense,
  updateAvailable,
  useModelPacks,
} from "../lib/model-packs";
import { setNarrationSettings, useNarrationSettings } from "../lib/narration-settings";

/** Names come from the app, not the manifest, so they are translated. */
const PACK_NAMES: Record<string, MessageKey> = {
  "supertonic-3": "listening.packs.naturalVoice",
  "whisper-base": "listening.packs.transcription",
};

const FAILURES: Record<NonNullable<PackStatus["reason"]>, MessageKey> = {
  network: "listening.packs.failedNetwork",
  checksum: "listening.packs.failedChecksum",
  server: "listening.packs.failedServer",
  "no-space": "listening.packs.noSpace",
};

function size(bytes: number | null): string {
  if (bytes === null) return "";
  return new Intl.NumberFormat(locale(), {
    style: "unit",
    unit: "megabyte",
    maximumFractionDigits: 0,
  }).format(bytes / 1_000_000);
}

function describe(pack: PackStatus): string {
  const percent = pack.bytes
    ? Math.min(99, Math.floor((pack.receivedBytes / pack.bytes) * 100))
    : 0;
  const withSize = (text: string) => (pack.bytes === null ? text : `${text} · ${size(pack.bytes)}`);
  switch (pack.state) {
    case "absent":
      return withSize(t("listening.packs.notDownloaded"));
    case "waiting":
      return withSize(t("listening.packs.waitingForWifi"));
    case "downloading":
      return t("listening.packs.downloading", { percent });
    case "updating":
      return t("listening.packs.updating", { percent });
    case "verifying":
      return t("listening.packs.verifying");
    case "no-space":
      return withSize(t("listening.packs.noSpace"));
    case "failed":
      return t(FAILURES[pack.reason ?? "network"]);
    case "ready":
      return withSize(
        updateAvailable(pack) ? t("listening.packs.updateAvailable") : t("listening.packs.ready"),
      );
  }
}

/**
 * The downloads behind listening: the natural voice and the transcription
 * model, with their size and state, and ways to fetch, retry or delete
 * them. Native apps only.
 */
export function ModelPacksSection() {
  const packs = useModelPacks();
  const settings = useNarrationSettings();
  const [license, setLicense] = useState<{ title: string; text: string } | null>(null);

  if (!packs) return null;

  const download = (pack: PackStatus) => {
    void downloadPack(pack.id).catch(() => {});
  };

  const remove = async (pack: PackStatus) => {
    const name = t(PACK_NAMES[pack.id] ?? "listening.packs.naturalVoice");
    const confirmed = await confirmDialog({
      title: t("listening.packs.deleteTitle", { name }),
      message: t(
        pack.kind === "voice"
          ? "listening.packs.deleteVoiceMessage"
          : "listening.packs.deleteTranscriptionMessage",
      ),
      confirmLabel: t("common.delete"),
      destructive: true,
    });
    if (confirmed) await deletePack(pack.id).catch(() => toast.error(t("listening.packs.failed")));
  };

  const openLicense = async (pack: PackStatus) => {
    const text = pack.installedVersion ? await packLicense(pack.id).catch(() => null) : null;
    if (text) setLicense({ title: pack.license ?? "", text });
    else if (pack.licenseUrl) window.open(pack.licenseUrl, "_blank", "noopener");
  };

  return (
    <SettingsGroup title={t("listening.packs.title")} footer={t("listening.packs.footer")}>
      {packs.map((pack) => {
        const busy = ["downloading", "updating", "verifying"].includes(pack.state);
        const installed = pack.installedVersion !== null;
        const canFetch = !installed && !busy && pack.availableVersion !== null;
        return (
          <SettingsRow
            key={pack.id}
            label={t(PACK_NAMES[pack.id] ?? "listening.packs.naturalVoice")}
            description={describe(pack)}
            stacked
          >
            <div className="flex flex-wrap items-center gap-2">
              {canFetch && (
                <Button onClick={() => download(pack)}>
                  {pack.state === "failed" || pack.state === "no-space"
                    ? t("listening.packs.retry")
                    : t("listening.packs.download")}
                </Button>
              )}
              {!installed && !busy && pack.availableVersion === null && (
                <Button onClick={() => download(pack)}>{t("listening.packs.retry")}</Button>
              )}
              {(installed || busy) && (
                <Button variant="ghost" onClick={() => void remove(pack)}>
                  {t("common.delete")}
                </Button>
              )}
              {pack.license && (pack.installedVersion || pack.licenseUrl) && (
                <Button variant="ghost" onClick={() => void openLicense(pack)}>
                  {t("listening.packs.license", { name: pack.license })}
                </Button>
              )}
            </div>
          </SettingsRow>
        );
      })}
      <SettingsRow
        label={t("listening.packs.mobileData")}
        description={t("listening.packs.mobileDataHint")}
      >
        <Switch
          label={t("listening.packs.mobileData")}
          checked={settings.downloadOnMobileData}
          onChange={(downloadOnMobileData) => setNarrationSettings({ downloadOnMobileData })}
        />
      </SettingsRow>
      <Sheet
        open={license !== null}
        onClose={() => setLicense(null)}
        label={license?.title ?? ""}
        className="max-w-[620px]"
      >
        <div className="flex max-h-[70vh] flex-col gap-3 p-5">
          <h2 className="text-[17px] font-semibold text-label">{license?.title}</h2>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-[12px] leading-relaxed text-label-secondary">
            {license?.text}
          </pre>
          <Button className="self-end" onClick={() => setLicense(null)}>
            {t("common.done")}
          </Button>
        </div>
      </Sheet>
    </SettingsGroup>
  );
}
