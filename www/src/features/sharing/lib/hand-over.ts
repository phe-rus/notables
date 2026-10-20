import { toast } from "@phe-rus/hino";
import { t } from "@/i18n/i18n";
import { androidBridge } from "@/platform/android-bridge";

/** Hands a link over the system share sheet where there is one, or copies it. */
export async function handOver(link: string, title: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url: link });
      return;
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
    }
  }
  if (androidBridge()?.shareText?.(title, link)) return;
  await navigator.clipboard.writeText(link);
  toast.success(t("sharing.linkCopied"), { description: t("sharing.linkCopiedBody") });
}
