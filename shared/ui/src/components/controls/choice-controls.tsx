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
    <fieldset className="flex rounded-[11px] bg-fill p-[3px] shadow-[inset_0_1px_2px_rgb(40_30_0/0.06)]">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative isolate min-w-[64px] flex-1 cursor-pointer rounded-[8px] px-3 py-1 text-center text-[13px] whitespace-nowrap transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60",
              selected
                ? "font-semibold text-label"
                : "font-medium text-label-secondary hover:text-label",
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
                className="absolute inset-0 -z-10 rounded-[8px] bg-elevated shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.08),0_3px_8px_-2px_rgb(0_0_0/0.10)]"
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
        "group/switch flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-normal",
        "shadow-[inset_0_1px_2px_rgb(0_0_0/0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "justify-end bg-accent" : "justify-start bg-separator/80",
      )}
    >
      {/* The thumb stretches while pressed, as on iOS. */}
      <motion.span
        layout
        transition={spring.snappy}
        className="h-[26px] w-[26px] rounded-full bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.04),0_2px_4px_rgb(0_0_0/0.16),0_3px_8px_rgb(0_0_0/0.10)] transition-[width] duration-fast group-active/switch:w-[32px]"
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
