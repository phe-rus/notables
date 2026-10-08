import { motion } from "motion/react";
import { useId } from "react";
import { CheckIcon } from "../../icons/icons";
import { cn } from "../../lib/class-names";
import { haptic } from "../../lib/haptics";
import { spring } from "../../motion/transitions";

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
              onChange={() => {
                haptic("selection");
                onChange(option.value);
              }}
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
                "text-caption2",
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
