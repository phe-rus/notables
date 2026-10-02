import { motion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { CheckIcon } from "../../icons/icons";
import { cn } from "../../lib/class-names";
import { spring } from "../../motion/transitions";
import { Select } from "../select/select";

/**
 * Mutually exclusive choices with a sliding selection, as on Apple
 * platforms. When the labels can't all fit the space it is given (a long
 * translation, a narrow pane) it becomes a pop-up button instead of
 * squeezing or spilling its text.
 */
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
  const frame = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const box = frame.current;
    const natural = measure.current;
    if (!box || !natural) return;
    const check = () => setFits(natural.offsetWidth <= box.clientWidth + 0.5);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(box);
    observer.observe(natural);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className="relative w-full min-w-0">
      {/* The control at its natural size, to know whether it fits. */}
      <div
        ref={measure}
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 flex w-max p-[3px] text-[13px] font-semibold"
      >
        {options.map((option) => (
          <span key={option.value} className="min-w-[64px] px-3 py-1 whitespace-nowrap">
            {option.label}
          </span>
        ))}
      </div>
      {fits ? (
        <fieldset className="flex w-full rounded-[11px] bg-fill p-[3px] shadow-[inset_0_1px_2px_rgb(40_30_0/0.06)]">
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
      ) : (
        <Select<T>
          label={label}
          value={value}
          options={options}
          onChange={onChange}
          searchable={false}
          className="rounded-[11px] py-1.5 text-[13px] font-semibold"
        />
      )}
    </div>
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
