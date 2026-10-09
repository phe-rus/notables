import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "../../lib/class-names";
import { spring } from "../../motion/transitions";
import { getDialog, type PendingDialog, settleDialog, subscribeDialogs } from "./dialog-store";

/**
 * Renders confirmation dialogs: a glass card that springs up over blurred
 * content. Escape or a click outside cancels; Enter confirms unless the
 * action is destructive, where the safe choice has focus.
 */
export function DialogHost() {
  const dialog = useSyncExternalStore(subscribeDialogs, getDialog, () => null);
  return (
    <AnimatePresence>{dialog && <ConfirmCard key={dialog.id} dialog={dialog} />}</AnimatePresence>
  );
}

function ConfirmCard({ dialog }: { dialog: PendingDialog }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = `dialog-title-${dialog.id}`;
  const messageId = `dialog-message-${dialog.id}`;

  useEffect(() => {
    const previous = window.document.activeElement as HTMLElement | null;
    (dialog.destructive ? cancelRef : confirmRef).current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settleDialog(false);
      }
      // Keep focus inside the dialog.
      if (event.key === "Tab") {
        const order = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
        const at = order.indexOf(window.document.activeElement as HTMLElement);
        event.preventDefault();
        order[(at + (event.shiftKey ? -1 : 1) + order.length) % order.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [dialog.destructive]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
      <motion.button
        type="button"
        tabIndex={-1}
        aria-label="Cancel"
        className="absolute inset-0 bg-black/25 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => settleDialog(false)}
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={dialog.message ? messageId : undefined}
        className="glass-menu relative flex w-full max-w-[340px] flex-col gap-4 rounded-5xl p-5 text-center"
        initial={{ opacity: 0, scale: 0.86, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 6, transition: { duration: 0.15 } }}
        transition={spring.bouncy}
      >
        <div className="flex flex-col gap-1.5 px-1 pt-1">
          <h2 id={titleId} className="text-body font-semibold text-label">
            {dialog.title}
          </h2>
          {dialog.message && (
            <p id={messageId} className="text-subheadline leading-snug text-label-secondary">
              {dialog.message}
            </p>
          )}
        </div>
        <div className="flex gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => settleDialog(false)}
            className="h-11 grow rounded-2xl bg-fill text-subheadline font-semibold text-label transition-[background-color,transform] hover:bg-separator/70 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            {dialog.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => settleDialog(true)}
            className={cn(
              "h-11 grow rounded-2xl text-subheadline font-semibold transition-[filter,transform] hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
              dialog.destructive ? "bg-danger text-white" : "bg-inverse text-on-inverse",
            )}
          >
            {dialog.confirmLabel ?? "OK"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
