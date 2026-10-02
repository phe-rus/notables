import { CloseIcon, cn, IconButton, PauseIcon, PlayIcon, spring } from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { BookCover } from "../../books/components/book-cover";
import { useBook } from "../../books/store/book-store";
import { closeAudiobook, useListening } from "../store/listening-store";

/**
 * The audiobook playing while you do something else: what's on, a play
 * button and a way back to the full player.
 */
export function MiniPlayer({ className }: { className?: string }) {
  const { bookId, playback } = useListening();
  const book = useBook(bookId ?? "");
  const show = Boolean(book && playback?.track);
  const progress = playback && playback.duration > 0 ? playback.time / playback.duration : 0;

  return (
    <AnimatePresence>
      {show && book && playback && (
        <motion.div
          role="region"
          aria-label="Now playing"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={spring.smooth}
          className={cn(
            "glass-menu flex items-center gap-3 overflow-hidden rounded-[20px] py-2 pr-2 pl-2",
            className,
          )}
        >
          <Link
            to="/read/$bookId"
            params={{ bookId: book.id }}
            className="flex min-w-0 grow items-center gap-3 no-underline"
          >
            <BookCover
              title={book.title}
              author={book.author}
              image={book.cover}
              className="w-9 shrink-0"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] font-semibold text-label">
                {playback.track?.title}
              </span>
              <span className="truncate text-[12px] text-label-secondary">
                {book.title || "Audiobook"}
              </span>
            </span>
          </Link>
          <IconButton label={playback.playing ? "Pause" : "Play"} onClick={playback.toggle}>
            {playback.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </IconButton>
          <IconButton label="Stop listening" onClick={closeAudiobook}>
            <CloseIcon size={17} />
          </IconButton>
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent"
            style={{ transform: `scaleX(${progress})` }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
