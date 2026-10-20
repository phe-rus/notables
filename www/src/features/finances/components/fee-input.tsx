import { minorToInput, parseMoney } from "@notables/core";
import { TextField } from "@phe-rus/hino/text-field";
import { useState } from "react";
import type { FeeInputProps } from "@/features/finances/model/types";
import { t } from "@/i18n/i18n";

export function FeeInput({ amount, currency, onChange }: FeeInputProps) {
  const [value, setValue] = useState(() => minorToInput(amount, currency));
  return (
    <TextField
      label={t("finances.fee")}
      className="h-9 text-subheadline"
      inputMode="decimal"
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onChange(parseMoney(event.target.value || "0", currency) ?? Number.NaN);
      }}
    />
  );
}
