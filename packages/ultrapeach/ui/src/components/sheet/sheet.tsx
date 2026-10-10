import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { cn } from "../../lib/class-names";
import { spring } from "../../motion/transitions";
import { useSheetFocus } from "./use-sheet-focus";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Read out by screen readers as the sheet's name. */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * A modal card: rises from the bottom edge on phones and floats in the
 * middle on larger screens. Escape or a tap outside closes it.
 */
export function Sheet({ open, ...props }: SheetProps) {
  return <AnimatePresence>{open && <OpenSheet {...props} />}</AnimatePresence>;
}

function OpenSheet({ onClose, label, className, children }: Omit<SheetProps, "open">) {
  const panel = useRef<HTMLDivElement>(null);
  useSheetFocus(panel, onClose);

  return (
    <div
      className={cn("fixed inset-0 z-[65] flex items-end justify-center", "sm:items-center sm:p-6")}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "glass-menu relative flex w-full flex-col overflow-hidden",
          "max-h-[92dvh] max-w-[560px]",
          "rounded-t-sheet sm:rounded-sheet",
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
  );
}
