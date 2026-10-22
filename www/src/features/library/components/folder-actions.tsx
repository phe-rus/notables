import { MoreIcon, spring } from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import type { FolderActionsProps } from "@/features/library/model/workspace-types";
import { t } from "@/i18n/i18n";

/** Folder actions unfold within their row, keeping the source card's width. */
export function FolderActions({ name, actions }: FolderActionsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      close();
    }
  };
  return (
    <span className="contents">
      <IconButton
        ref={trigger}
        size="icon-xs"
        className="me-2 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-1.5 [@media(pointer:coarse)]:before:content-['']"
        variant="ghost"
        label={t("workspace.folderOptions", { name })}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={closeOnEscape}
      >
        <MoreIcon size={18} />
      </IconButton>
      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            id={panelId}
            className="block w-full overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : spring.smooth}
          >
            <span
              role="toolbar"
              aria-label={t("workspace.folderOptions", { name })}
              className="flex justify-end gap-4 px-3 pb-1.5"
            >
              {actions.map((action) => (
                <IconButton
                  key={action.label}
                  label={action.label}
                  size="icon-xs"
                  className="size-7! [&_svg]:size-4 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-2 [@media(pointer:coarse)]:before:content-['']"
                  variant={action.destructive ? "destructive" : "ghost"}
                  disabled={action.disabled}
                  onKeyDown={closeOnEscape}
                  onClick={() => {
                    close();
                    action.onSelect();
                  }}
                >
                  {action.icon}
                </IconButton>
              ))}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
