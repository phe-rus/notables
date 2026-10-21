import {
  cn,
  SearchField,
  SearchIcon,
  spring,
  useMinimizeOnScroll,
  useVisualViewport,
} from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { FloatingSearchToolbarProps } from "./types";

/** Search keeps its place while the capsule contracts; the primary action stays reachable. */
export function FloatingSearchToolbar({
  label,
  placeholder,
  value,
  onChange,
  action,
  leading,
}: FloatingSearchToolbarProps) {
  const [scrolledAway, setScrolledAway] = useMinimizeOnScroll();
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const viewport = useVisualViewport();
  const reducedMotion = useReducedMotion();
  const compact = scrolledAway && !focused;
  return (
    <nav
      aria-label={label}
      className="pointer-events-none fixed inset-x-4 z-30 flex items-center gap-3 md:hidden"
      style={{ bottom: viewport?.keyboardOpen ? 12 : "max(14px, env(safe-area-inset-bottom))" }}
    >
      {leading && <div className="pointer-events-auto shrink-0">{leading}</div>}
      <motion.div
        initial={false}
        animate={{ width: compact ? 48 : 0, flexGrow: compact ? 0 : 1 }}
        transition={reducedMotion ? { duration: 0 } : spring.smooth}
        className={cn(
          "glass pointer-events-auto relative h-12 min-w-0 overflow-hidden rounded-full",
          "shrink-0",
        )}
      >
        <motion.div
          inert={compact}
          aria-hidden={compact || undefined}
          initial={false}
          animate={{ opacity: compact ? 0 : 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.12 }}
        >
          <SearchField
            ref={field}
            aria-label={placeholder}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-12 rounded-full border-0 bg-transparent px-4 shadow-none ring-0"
          />
        </motion.div>
        <motion.div
          initial={false}
          animate={{ opacity: compact ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.12 }}
          aria-hidden={!compact || undefined}
          className="absolute inset-0"
          style={{ pointerEvents: compact ? "auto" : "none" }}
        >
          <IconButton
            label={placeholder}
            variant="ghost"
            size="icon-lg"
            className="absolute inset-0"
            tabIndex={compact ? 0 : -1}
            onClick={() => {
              flushSync(() => {
                setScrolledAway(false);
                setFocused(true);
              });
              field.current?.focus({ preventScroll: true });
            }}
          >
            <SearchIcon size={19} />
          </IconButton>
        </motion.div>
      </motion.div>
      <IconButton
        label={action.label}
        variant="ghost"
        size="icon-lg"
        className="glass pointer-events-auto ms-auto"
        onClick={(event) => action.onPress(event.currentTarget)}
      >
        {action.icon}
      </IconButton>
    </nav>
  );
}
