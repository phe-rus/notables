import { TranscriptionProvider } from "@notables/editor";
import { cn, spring, useMediaQuery } from "@notables/ui";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { setDrawerOpen, useDrawerOpen } from "../components/layout/drawer-store";
import { ResizeHandle } from "../components/layout/resize-handle";
import { BooksList } from "../features/books/components/books-list";
import { InvoicesList } from "../features/invoices/components/invoices-list";
import { Sidebar, type SidebarLocation } from "../features/library/components/library-sidebar";
import { NotesList } from "../features/library/components/notes-list";
import { getView } from "../features/library/model/library-views";
import { getLibrary, useLibraryReady } from "../features/library/store/library-store";
import { seedWelcomeLibrary } from "../features/onboarding/lib/seed-welcome-library";
import { SearchPalette } from "../features/search/components/search-palette";
import { AppearanceSync } from "../features/settings/components/appearance-sync";
import { sidebarWidth } from "../features/settings/model/preferences";
import { updatePreferences, usePreferences } from "../features/settings/store/preferences-store";
import { isShortcut } from "../lib/keyboard/shortcuts";
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
  const navigate = useNavigate();
  const note = useMatch({ from: "/_app/notes/$noteId", shouldThrow: false });
  const book = useMatch({ from: "/_app/books/$bookId", shouldThrow: false });
  const invoice = useMatch({ from: "/_app/invoices/$invoiceId", shouldThrow: false });
  const pathname = useLocation({ select: (location) => location.pathname });
  const inBooks = pathname.startsWith("/books");
  const inInvoices = pathname.startsWith("/invoices");
  const inSettings = pathname.startsWith("/settings");
  const noteId = note?.params.noteId;
  const bookId = book?.params.bookId;
  const invoiceId = invoice?.params.invoiceId;
  const detailOpen = Boolean(note || book || invoice || inSettings);
  const isPhone = useMediaQuery("(max-width: 767px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const drawerOpen = useDrawerOpen();
  const transcription = useMemo(createNativeTranscription, []);
  const libraryReady = useLibraryReady();
  const { width: storedWidth, collapsed } = usePreferences().sidebar;
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const width = liveWidth ?? storedWidth;

  const location: SidebarLocation = inSettings
    ? "settings"
    : inInvoices
      ? "invoices"
      : inBooks
        ? "books"
        : view.id === "note"
          ? "all"
          : view.id;

  const createNote = useCallback(() => {
    const entry = getLibrary().create(view.kind);
    void navigate({ to: "/notes/$noteId", params: { noteId: entry.id }, search: (s) => s });
  }, [navigate, view.kind]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isShortcut(event, "n")) {
        event.preventDefault();
        createNote();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNote]);

  // A first visit finds a short guide and a few examples instead of nothing.
  useEffect(() => {
    if (libraryReady) void seedWelcomeLibrary();
  }, [libraryReady]);

  // Close the drawer whenever the place changes.
  useEffect(() => setDrawerOpen(false), [pathname, viewId]);

  const commitWidth = (next: number) => {
    setLiveWidth(null);
    updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, width: next } }));
  };

  const sidebarProps = { active: location, activeNoteId: noteId, onNewNote: createNote };

  return (
    <div className="flex h-dvh overflow-hidden bg-sidebar">
      <AppearanceSync />
      <SearchPalette />

      {/* Desktop: the sidebar sits on the window; content floats in an inset card. */}
      <AnimatePresence initial={false}>
        {isDesktop && !collapsed && (
          <motion.div
            className="relative flex shrink-0"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={liveWidth === null ? spring.smooth : { duration: 0 }}
          >
            <Sidebar {...sidebarProps} className="w-full min-w-[220px]" />
            <ResizeHandle
              label="Resize sidebar"
              width={width}
              min={sidebarWidth.min}
              max={sidebarWidth.max}
              onResize={setLiveWidth}
              onCommit={commitWidth}
              onReset={() => commitWidth(sidebarWidth.default)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phones and tablets: a drawer over blurred content, dismissed by tap or swipe. */}
      <AnimatePresence>
        {!isDesktop && drawerOpen && (
          <div className="fixed inset-0 z-40 flex">
            <motion.button
              type="button"
              aria-label="Close library"
              className="absolute inset-0 bg-black/25 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="relative flex w-[min(86vw,340px)] rounded-r-[22px] bg-sidebar shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.5, right: 0.04 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -500) setDrawerOpen(false);
              }}
            >
              <Sidebar {...sidebarProps} className="w-full pt-[env(safe-area-inset-top)]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        className="flex min-w-0 grow overflow-hidden bg-background lg:my-2 lg:mr-2 lg:rounded-[16px] lg:border lg:border-separator/70 lg:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_28px_rgba(0,0,0,0.05)]"
        // A drawer on smaller screens nudges the content back for depth.
        animate={!isDesktop && drawerOpen ? { scale: 0.97, x: 24 } : { scale: 1, x: 0 }}
        transition={spring.smooth}
      >
        {!inSettings &&
          (inInvoices ? (
            <InvoicesList
              activeId={invoiceId}
              onOpenSidebar={() => setDrawerOpen(true)}
              className={cn(detailOpen ? "hidden md:flex" : "flex")}
            />
          ) : inBooks ? (
            <BooksList
              activeId={bookId}
              onOpenSidebar={() => setDrawerOpen(true)}
              className={cn(detailOpen ? "hidden md:flex" : "flex")}
            />
          ) : (
            <NotesList
              view={view}
              activeId={noteId}
              onOpenSidebar={() => setDrawerOpen(true)}
              onCreateNote={createNote}
              className={cn(detailOpen ? "hidden md:flex" : "flex")}
            />
          ))}

        <main
          className={cn(
            "relative min-w-0 grow flex-col bg-paper",
            detailOpen ? "flex" : "hidden md:flex",
          )}
        >
          {/* Screens push in from the right on phones and settle into place on larger displays. */}
          <TranscriptionProvider service={transcription}>
            <motion.div
              key={
                noteId ??
                bookId ??
                invoiceId ??
                (inSettings ? "settings" : inInvoices ? "invoices" : inBooks ? "books" : "notes")
              }
              className="flex min-h-0 grow flex-col"
              initial={isPhone ? { x: 56, opacity: 0.6 } : { y: 8, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={spring.smooth}
            >
              <Outlet />
            </motion.div>
          </TranscriptionProvider>
        </main>
      </motion.div>
    </div>
  );
}
