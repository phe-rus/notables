import { motion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/class-names";
import { haptic } from "../../lib/haptics";
import { spring } from "../../motion/transitions";
import { Picker } from "../picker/picker";

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
        className="pointer-events-none invisible absolute top-0 flex w-max p-[3px] text-footnote font-semibold"
      >
        {options.map((option) => (
          <span key={option.value} className="min-w-[64px] px-3 py-1 whitespace-nowrap">
            {option.label}
          </span>
        ))}
      </div>
      {fits ? (
        <fieldset className="flex w-full rounded-lg bg-fill p-[3px] shadow-[inset_0_1px_2px_rgb(40_30_0/0.06)]">
          <legend className="sr-only">{label}</legend>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <label
                key={option.value}
                className={cn(
                  "relative isolate min-w-[64px] flex-1 cursor-pointer rounded-md px-3 py-1 text-center text-footnote whitespace-nowrap transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60",
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
                  onChange={() => {
                    haptic("selection");
                    onChange(option.value);
                  }}
                  className="sr-only"
                />
                {selected && (
                  <motion.span
                    layoutId={`segment-${id}`}
                    className="absolute inset-0 -z-10 rounded-md bg-elevated shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.08),0_3px_8px_-2px_rgb(0_0_0/0.10)]"
                    transition={spring.snappy}
                  />
                )}
                {option.label}
              </label>
            );
          })}
        </fieldset>
      ) : (
        <Picker<T>
          label={label}
          value={value}
          options={options}
          onChange={onChange}
          searchable={false}
          className="rounded-lg py-1.5 text-footnote font-semibold"
        />
      )}
    </div>
  );
}
