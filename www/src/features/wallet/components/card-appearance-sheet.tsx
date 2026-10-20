import { SwatchPicker } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Sheet } from "@phe-rus/hino/sheet";
import { accents } from "@phe-rus/hino/tokens";
import { t } from "@/i18n/i18n";
import type { CardAppearanceSheetProps } from "../model/types";

export function CardAppearanceSheet({
  open,
  palette,
  onClose,
  onChange,
}: CardAppearanceSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={t("wallet.appearance")}>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-headline font-semibold">{t("wallet.appearance")}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t("common.done")}
          </Button>
        </div>
        <SwatchPicker
          value={palette}
          label={t("setup.accentColour")}
          options={Object.values(accents).map((accent) => ({
            value: accent.id,
            label: t(`wallet.palette.${accent.id}`),
            color: accent.swatch,
            ink: accent.light.onAccent,
          }))}
          onChange={onChange}
        />
      </div>
    </Sheet>
  );
}
