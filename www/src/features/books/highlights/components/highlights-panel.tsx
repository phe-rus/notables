import { CloseIcon, cn, IconButton, spring } from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import type { BookChapter } from "../../reader/use-book-content";
import type { HighlightEntry } from "../store/highlight-store";
import { swatchClass } from "./highlight-palette";

/**
 * Every highlight in the book, by chapter. Choosing one turns to its page.
 */
export function HighlightsPanel({
  open,
  onClose,
  entries,
  chapters,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  entries: HighlightEntry[];
  chapters: BookChapter[];
  onChoose: (entry: HighlightEntry) => void;
}) {
  const groups = chapters
    .map((chapter, index) => ({
      chapter,
      index,
      items: entries
        .filter((entry) => entry.noteId === chapter.noteId)
        .sort((a, b) => a.quote.offset - b.quote.offset),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.button
            type="button"
            aria-label="Close highlights"
            tabIndex={-1}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            aria-label="Highlights"
            className="glass-menu relative flex h-full w-full max-w-[380px] flex-col sm:m-3 sm:h-[calc(100%-24px)] sm:rounded-5xl"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={spring.smooth}
          >
            <header className="flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
              <h2 className="text-title3 font-bold tracking-tight">Highlights</h2>
              <IconButton label="Close" onClick={onClose}>
                <CloseIcon size={18} />
              </IconButton>
            </header>
            <div className="flex grow flex-col gap-5 overflow-y-auto px-3 pb-8">
              {groups.length === 0 && (
                <p className="px-2 pt-6 text-center text-subheadline leading-snug text-label-secondary">
                  Turn on highlighting, then select words on a page to mark them.
                </p>
              )}
              {groups.map((group) => (
                <section key={group.chapter.noteId} className="flex flex-col gap-1">
                  <h3 className="px-2 pb-1 text-caption font-medium text-label-tertiary">
                    Chapter {group.index + 1} · {group.chapter.title}
                  </h3>
                  {group.items.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onChoose(entry)}
                      className="flex gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-fill/60"
                    >
                      <span
                        className={cn(
                          "w-1 shrink-0 self-stretch rounded-full",
                          swatchClass[entry.color],
                        )}
                      />
                      <span className="line-clamp-4 font-serif text-subheadline leading-snug text-label">
                        {entry.quote.exact}
                      </span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
