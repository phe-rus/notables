import { formatMoney, type LineItem, lineAmount } from "@notables/core";
import { CloseIcon, PlusIcon, spring } from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { TextInput } from "../../../components/form/form-fields";
import { newLineItem } from "../store/invoice-store";
import { MoneyInput } from "./money-input";

/** What was sold: description, quantity and unit price per line. */
export function LineItemsEditor({
  items,
  currency,
  onChange,
}: {
  items: LineItem[];
  currency: string;
  onChange: (items: LineItem[]) => void;
}) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-2xl border border-separator/70 bg-elevated p-2.5">
              <div className="flex items-center gap-2">
                <TextInput
                  aria-label={`Item ${index + 1} description`}
                  placeholder="What you provided"
                  value={item.description}
                  onChange={(e) => update(item.id, { description: e.target.value })}
                />
                <button
                  type="button"
                  aria-label={`Remove item ${index + 1}`}
                  disabled={items.length === 1}
                  onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-label-tertiary transition-colors hover:bg-fill hover:text-danger disabled:opacity-30"
                >
                  <CloseIcon size={14} strokeWidth={2.2} />
                </button>
              </div>
              <div className="grid grid-cols-[72px_1fr_auto] items-center gap-2">
                <QuantityInput
                  label={`Item ${index + 1} quantity`}
                  value={item.quantity}
                  onChange={(quantity) => update(item.id, { quantity })}
                />
                <MoneyInput
                  label={`Item ${index + 1} unit price`}
                  value={item.unitPrice}
                  currency={currency}
                  onChange={(unitPrice) => update(item.id, { unitPrice })}
                />
                <span className="min-w-[96px] text-right text-[14px] font-medium tabular-nums">
                  {formatMoney(lineAmount(item), currency)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => onChange([...items, newLineItem()])}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-separator py-2.5 text-[14px] font-medium text-accent-text transition-colors hover:bg-fill/60"
      >
        <PlusIcon size={15} strokeWidth={2.2} />
        Add item
      </button>
    </div>
  );
}

/** Quantities may be fractional (1.5 hours); partial input is kept while typing. */
function QuantityInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const [text, setText] = useState(String(value));
  return (
    <TextInput
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const quantity = Number(event.target.value.replace(",", "."));
        if (event.target.value.trim() !== "" && Number.isFinite(quantity) && quantity >= 0) {
          onChange(quantity);
        }
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
