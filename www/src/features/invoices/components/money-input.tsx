import { minorToInput, parseMoney } from "@notables/core";
import { useEffect, useState } from "react";
import { TextInput } from "./form-fields";

/**
 * An amount typed as a decimal ("12.50") and kept as minor units. Text is
 * kept while typing and normalised when the field loses focus.
 */
export function MoneyInput({
  value,
  currency,
  onChange,
  label,
  className,
}: {
  value: number;
  currency: string;
  onChange: (minor: number) => void;
  label: string;
  className?: string;
}) {
  const [text, setText] = useState(() => (value ? minorToInput(value, currency) : ""));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value ? minorToInput(value, currency) : "");
  }, [value, currency, focused]);

  return (
    <TextInput
      inputMode="decimal"
      aria-label={label}
      placeholder="0"
      value={text}
      className={className}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        setText(event.target.value);
        const minor = parseMoney(event.target.value, currency);
        if (minor !== null) onChange(minor);
        else if (event.target.value.trim() === "") onChange(0);
      }}
    />
  );
}
