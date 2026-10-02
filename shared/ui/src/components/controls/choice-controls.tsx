import { motion } from "motion/react";
import { useId } from "react";
import { CheckIcon } from "../../icons/icons";
import { cn } from "../../lib/class-names";
import { spring } from "../../motion/transitions";

/** Mutually exclusive choices with a sliding selection, as on Apple platforms. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <fieldset className="flex rounded-[10px] bg-fill p-[3px]">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative isolate min-w-[64px] flex-1 cursor-pointer rounded-[8px] px-3 py-1 text-center text-[13px] whitespace-nowrap transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60",
              selected ? "font-semibold text-label" : "text-label-secondary hover:text-label",
            )}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {selected && (
              <motion.span
                layoutId={`segment-${id}`}
                className="absolute inset-0 -z-10 rounded-[8px] bg-elevated shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                transition={spring.snappy}
              />
            )}
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[28px] w-[46px] items-center rounded-full p-[2px] transition-colors duration-normal",
        checked ? "justify-end bg-accent" : "justify-start bg-fill",
      )}
    >
      <motion.span
        layout
        transition={spring.snappy}
        className="size-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
      />
    </button>
  );
}

/** Colour swatches with a check on the chosen one. */
export function SwatchPicker<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  /** `ink` colours the check drawn on the swatch. */
  options: Array<{ value: T; label: string; color: string; ink: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-wrap gap-3">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className="group flex cursor-pointer flex-col items-center gap-1.5"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-elevated transition-[box-shadow,transform] duration-fast group-active:scale-95 peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
                selected
                  ? "ring-2 ring-label/70"
                  : "ring-0 group-hover:ring-2 group-hover:ring-separator",
              )}
              style={{ background: option.color }}
            >
              {selected && (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring.bouncy}
                >
                  <CheckIcon size={16} strokeWidth={2.6} style={{ color: option.ink }} />
                </motion.span>
              )}
            </span>
            <span
              className={cn(
                "text-[11px]",
                selected ? "font-semibold text-label" : "text-label-tertiary",
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
