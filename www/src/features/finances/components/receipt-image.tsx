import { useMediaSource } from "@notables/pluraliti";
import type { ReceiptImageProps } from "@/features/finances/model/types";
import { t } from "@/i18n/i18n";

export function ReceiptImage({ src }: ReceiptImageProps) {
  const resolved = useMediaSource(src);
  return resolved ? (
    <img
      src={resolved}
      alt={t("finances.receipt")}
      className="w-full rounded-xl border border-separator object-contain"
    />
  ) : null;
}
