import { TranscriptionProvider } from "@notables/editor";
import { cn, spring, useMediaQuery } from "@notables/ui";
import { createFileRoute, Outlet, useLocation, useMatch } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { BooksList } from "../features/books/components/books-list";
import { Sidebar } from "../features/library/components/library-sidebar";
import { NotesList } from "../features/library/components/notes-list";
import { getView } from "../features/library/model/library-views";
import { createNativeTranscription } from "../platform/native-transcription";

export const Route = createFileRoute("/_app")({
  // Private notes live on the device, so the app shell renders client-side.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { view?: string } => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  component: AppShell,
});

function AppShell() {
  const { view: viewId } = Route.useSearch();
  const view = getView(viewId);
  const note = useMatch({ from: "/_app/notes/$noteId", shouldThrow: false });
  const book = useMatch({ from: "/_app/books/$bookId", shouldThrow: false });
  const inBooks = useLocation({ select: (location) => location.pathname.startsWith("/books") });
  const noteId = note?.params.noteId;
  const bookId = book?.params.bookId;
  const detailOpen = Boolean(note || book);
  const isPhone = useMediaQuery("(max-width: 767px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const transcription = useMemo(createNativeTranscription, []);

  useEffect(() => setSidebarOpen(false), [viewId, noteId, bookId, inBooks]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar active={inBooks ? "books" : view.id} className="hidden lg:flex" />

      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 flex lg:hidden">
            <motion.div
              className="flex"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={spring.smooth}
            >
              <Sidebar
                active={inBooks ? "books" : view.id}
                className="pt-[max(18px,env(safe-area-inset-top))] shadow-2xl"
              />
            </motion.div>
            <motion.button
              type="button"
              aria-label="Close library"
              className="grow bg-black/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {inBooks ? (
        <BooksList
          activeId={bookId}
          onOpenSidebar={() => setSidebarOpen(true)}
          className={cn(detailOpen ? "hidden md:flex" : "flex")}
        />
      ) : (
        <NotesList
          view={view}
          activeId={noteId}
          onOpenSidebar={() => setSidebarOpen(true)}
          className={cn(detailOpen ? "hidden md:flex" : "flex")}
        />
      )}

      <main
        className={cn(
          "relative min-w-0 grow flex-col bg-paper",
          detailOpen ? "flex" : "hidden md:flex",
        )}
      >
        {/* Screens push in from the right on phones and settle into place on larger displays. */}
        <TranscriptionProvider service={transcription}>
          <motion.div
            key={noteId ?? bookId ?? (inBooks ? "books" : "notes")}
            className="flex min-h-0 grow flex-col"
            initial={isPhone ? { x: 56, opacity: 0.6 } : { y: 10, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={spring.smooth}
          >
            <Outlet />
          </motion.div>
        </TranscriptionProvider>
      </main>
    </div>
  );
}
