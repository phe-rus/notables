import { ChevronRightIcon, FolderIcon, NoteIcon, spring } from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { t } from "@/i18n/i18n";
import type { SidebarFolderProps } from "../model/workspace-types";
import { NavItem } from "./sidebar-rows";

/** A folder stays navigable while a separate disclosure reveals a short note tree. */
export function SidebarFolder({
  folder,
  entries,
  active,
  activeNoteId,
  counts,
  menu,
}: SidebarFolderProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reducedMotion = useReducedMotion();
  const preview = [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-0.5">
        <IconButton
          size="icon-xs"
          variant="ghost"
          className="size-6"
          label={folder.name}
          aria-expanded={open}
          aria-controls={id}
          disabled={!entries.length}
          onClick={() => setOpen((value) => !value)}
        >
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            transition={reducedMotion ? { duration: 0 } : spring.smooth}
          >
            <ChevronRightIcon size={12} className="rtl:-scale-x-100" />
          </motion.span>
        </IconButton>
        <div className="min-w-0 grow">
          <NavItem
            to="/"
            search={{ view: `folder:${folder.id}` }}
            active={active}
            menu={menu}
            icon={
              <span data-accent={folder.color} className="text-accent-text">
                <FolderIcon size={17} />
              </span>
            }
            trailing={counts ? entries.length : undefined}
          >
            {folder.name}
          </NavItem>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : spring.smooth}
            className="overflow-hidden"
          >
            <div className="ms-6 border-s border-separator/30 ps-2 py-0.5">
              {preview.map((entry) => (
                <NavItem
                  key={entry.id}
                  to="/notes/$noteId"
                  params={{ noteId: entry.id }}
                  search={{ view: `folder:${folder.id}` }}
                  active={activeNoteId === entry.id}
                  icon={<NoteIcon size={14} />}
                >
                  {entry.title || t("common.untitled")}
                </NavItem>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
