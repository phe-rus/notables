import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { cn } from "../../lib/class-names";
import { spring } from "../../motion/transitions";

/**
 * A modal card: rises from the bottom edge on phones and floats in the
 * middle on larger screens. Escape or a tap outside closes it.
 */
export function Sheet({
  open,
  onClose,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Read out by screen readers as the sheet's name. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(
              "glass-menu relative flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]",
              className,
            )}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={spring.smooth}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
