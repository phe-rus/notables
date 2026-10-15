import { toast } from "@phe-rus/hino";
import { t } from "../../../i18n/i18n";
import { isTauri } from "../../../platform/runtime";
import { downloadPack, modelPacksStatus, packSize } from "./model-packs";
import type { NaturalVoiceInfo } from "./natural-voice";

const languageOf = (tag: string) => tag.toLowerCase().split(/[-_]/)[0] ?? "";

/**
 * Reading aloud found no voice: says why, and offers the natural voice
 * download right there, or how far along it is.
 */
export async function offerVoice(lang: string, installed: NaturalVoiceInfo | null) {
  if (installed && !installed.languages.includes(languageOf(lang))) {
    toast(t("listening.noVoiceForLanguage"));
    return;
  }
  if (!isTauri()) {
    toast(t("listening.voiceNeeded"), { description: t("listening.voiceInApp") });
    return;
  }
  const pack = (await modelPacksStatus().catch(() => [])).find((each) => each.kind === "voice");
  if (!pack) {
    toast.error(t("listening.voiceNeeded"), { description: t("listening.packs.failedServer") });
    return;
  }
  if (["downloading", "verifying", "updating"].includes(pack.state)) {
    const percent = pack.bytes ? Math.floor((pack.receivedBytes / pack.bytes) * 100) : 0;
    toast(t("listening.voiceDownloading"), {
      description: t("listening.packs.downloading", { percent }),
    });
    return;
  }
  toast(t("listening.voiceNeeded"), {
    description: pack.bytes
      ? t("listening.voiceNeededSize", { size: packSize(pack.bytes) })
      : t("listening.voiceNeededBody"),
    action: {
      label: t("listening.packs.download"),
      onClick: () => {
        void downloadPack(pack.id).catch(() => toast.error(t("listening.packs.failedNetwork")));
        toast(t("listening.voiceDownloading"), { description: t("listening.voiceReadyLater") });
      },
    },
  });
}
