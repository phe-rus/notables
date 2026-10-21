import type { NoteKind } from "@notables/core";
import { TranscriptionProvider } from "@notables/pluraliti";
import { cn, spring, useMediaQuery, useVisualViewport } from "@phe-rus/hino";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
} from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { t } from "@/i18n/i18n";
import { setDrawerOpen, useDrawerOpen } from "../components/layout/drawer-store";
import { ResizeHandle } from "../components/layout/resize-handle";
import { TabBar } from "../components/layout/tab-bar";
import { useWarmRoutes } from "../components/layout/use-warm-routes";
import { BooksList } from "../features/books/components/books-list";
import { ReminderRunner } from "../features/calendar/components/reminder-runner";
import { PhoneStatusBanner } from "../features/devices/components/phone-status-banner";
import {
  pauseBrowserSessions,
  startBrowserSessions,
} from "../features/devices/lib/browser-sessions";
import { InvoicesList } from "../features/invoices/components/invoices-list";
import { Sidebar, type SidebarLocation } from "../features/library/components/library-sidebar";
import { NotesList } from "../features/library/components/notes-list";
import { indexNoteMedia } from "../features/library/lib/index-note-media";
import { folderView, getView, groupOf } from "../features/library/model/library-views";
import { getLibrary, useFolders, useLibraryReady } from "../features/library/store/library-store";
import { MiniPlayer } from "../features/listening/components/mini-player";
import { ModelPacksRunner } from "../features/listening/components/model-packs-runner";
import { seedWelcomeLibrary } from "../features/onboarding/lib/seed-welcome-library";
import { SearchPalette } from "../features/search/components/search-palette";
import { AppearanceSync } from "../features/settings/components/appearance-sync";
import { sidebarWidth } from "../features/settings/model/preferences";
import { updatePreferences, usePreferences } from "../features/settings/store/preferences-store";
import { needsSetup } from "../features/setup/lib/setup-state";
import { ShareSessionsRunner } from "../features/sharing/components/share-sessions-runner";
import { StudioHost } from "../features/studio/components/studio-host";
import { sweepMedia } from "../features/trash/lib/media-sweep";
import { eraseExpired } from "../features/trash/lib/recycle-bin";
import { WidgetPublisher } from "../features/widgets/components/widget-publisher";
import { isShortcut } from "../lib/keyboard/shortcuts";
import { markAppReady } from "../platform/app-ready";
import { canOpenLibrary, standaloneWeb } from "../platform/library-access";
import { createNativeTranscription } from "../platform/native-transcription";
import { preventPageZoom } from "../platform/page-zoom";
import { isTauri } from "../platform/runtime";
import { inBrowserSession } from "../platform/session/browser-session-store";
import { startSpace } from "../platform/space/space-identity";
import { startSpaceRemoval } from "../platform/space/space-removal";
import { startSpaceSync, stopSpaceSync } from "../platform/space/space-sync";

export const Route = createFileRoute("/_app")({
  // Private notes live on the device, so the app shell renders client-side.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { view?: string } => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const allowed = canOpenLibrary();
  useEffect(() => {
    if (!allowed) void navigate({ to: "/link", replace: true });
  }, [allowed, navigate]);
  return allowed ? <WorkspaceShell /> : null;
}

function WorkspaceShell() {
  useWarmRoutes();
  const { view: viewId } = Route.useSearch();
  const folders = useFolders();
  const folder = folders.find((item) => `folder:${item.id}` === viewId);
  const view = folder
    ? folderView(
        folder,
        folder.id === (folders.find((item) => item.id === "default-writings") ?? folders[0])?.id,
        folders,
      )
    : getView(viewId);
  const navigate = useNavigate();
  const note = useMatch({ from: "/_app/notes/$noteId", shouldThrow: false });
  const book = useMatch({ from: "/_app/books/$bookId", shouldThrow: false });
  const invoice = useMatch({ from: "/_app/invoices/$invoiceId", shouldThrow: false });
  const pathname = useLocation({ select: (location) => location.pathname });
  const inBooks = pathname.startsWith("/books");
  const inInvoices = pathname.startsWith("/invoices");
  const inSettings = pathname.startsWith("/settings");
  const inTrash = pathname.startsWith("/trash");
  const inCalendar = pathname.startsWith("/calendar");
  const inConnections = pathname.startsWith("/connections");
  const inWallet = pathname === "/wallet" || pathname === "/wallet/";
  // Settings, Calendar, Connections and Recently Deleted fill the content area without a list beside them.
  const workspace = pathname === "/" && !folder && (!viewId || viewId === "workspace");
  const fullPage = workspace || inSettings || inTrash || inCalendar || inConnections || inWallet;
  const noteId = note?.params.noteId;
  const bookId = book?.params.bookId;
  const invoiceId = invoice?.params.invoiceId;
  const detailOpen = Boolean(note || book || invoice || fullPage);
  // On phones Settings is a top-level place, so it keeps the tab bar.
  const showTabBar = !(note || book || invoice);
  const isPhone = useMediaQuery("(max-width: 767px)");
  const reducedMotion = useReducedMotion();
  const viewport = useVisualViewport();
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const nativeTransitions = typeof document !== "undefined" && "startViewTransition" in document;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const drawerOpen = useDrawerOpen();
  const transcription = useMemo(createNativeTranscription, []);
  const libraryReady = useLibraryReady();
  const { width: storedWidth, collapsed } = usePreferences().sidebar;
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const width = liveWidth ?? storedWidth;

  const location: SidebarLocation = workspace
    ? "workspace"
    : inWallet
      ? "wallet"
      : inSettings
        ? "settings"
        : inTrash
          ? "trash"
          : inCalendar
            ? "calendar"
            : inConnections
              ? "connections"
              : inInvoices
                ? "invoices"
                : inBooks
                  ? "books"
                  : view.id.startsWith("folder:")
                    ? (view.id as SidebarLocation)
                    : (groupOf(view.id) ?? "all");

  const createNote = useCallback(
    (kind?: NoteKind, format?: "document" | "spreadsheet") => {
      const entry = getLibrary().create(kind ?? view.kind, view.folderId, true);
      if (format) getLibrary().update(entry.id, { format });
      void navigate({
        to: "/notes/$noteId",
        params: { noteId: entry.id },
        search: (s) => ({ ...s, view: entry.folderId ? `folder:${entry.folderId}` : s.view }),
      });
    },
    [navigate, view.kind, view.folderId],
  );

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

  // A browser is a window onto a phone (spec 0005): it pairs first, and the
  // phone has done setup. A new device starts with setup; the splash waits for the library.
  const browser = inBrowserSession();
  useEffect(() => {
    if (browser) return;
    if (!isTauri() && !standaloneWeb) void navigate({ to: "/link", replace: true });
    else if (needsSetup()) void navigate({ to: "/welcome", replace: true });
  }, [navigate, browser]);
  // A phone serves the browsers it approved while it runs.
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    // The space first: the browsers it serves are told which one they show.
    void startSpace().finally(() => {
      if (!active) return;
      startBrowserSessions();
      // Removal first, so the sync below already skips removed devices.
      startSpaceRemoval();
      // Linked devices keep a full copy each, in step while they're online.
      startSpaceSync(async () => {
        const library = getLibrary();
        await library.loaded;
        return [...library.entries.keys()];
      });
    });
    return () => {
      active = false;
      stopSpaceSync();
      pauseBrowserSessions();
    };
  }, []);
  useEffect(() => {
    if (libraryReady) markAppReady();
  }, [libraryReady]);

  useEffect(() => {
    if (libraryReady && !browser) return indexNoteMedia();
  }, [libraryReady, browser]);

  // A first visit finds a short guide and a few examples instead of nothing.
  useEffect(() => {
    // Not before setup, whose last step offers to start fresh instead, and never
    // from a browser, whose library is the phone's.
    if (libraryReady && !browser && !needsSetup()) void seedWelcomeLibrary();
  }, [libraryReady, browser]);

  // Recently Deleted erases what's been there a week: on launch, then hourly.
  // The phone does this for a browser.
  useEffect(() => {
    if (!libraryReady || browser) return;
    // Then media nothing uses any more; the sweep itself runs at most daily.
    const tidy = () =>
      void eraseExpired()
        .then(() => sweepMedia())
        .catch(() => {});
    tidy();
    const timer = window.setInterval(tidy, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [libraryReady, browser]);

  // Close the drawer whenever the place changes.
  useEffect(() => setDrawerOpen(false), [pathname, viewId]);
  // Like a native app, the app's own screens don't zoom as a page.
  useEffect(preventPageZoom, []);

  const commitWidth = (next: number) => {
    setLiveWidth(null);
    updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, width: next } }));
  };

  const sidebarProps = { active: location, activeNoteId: noteId, onNewNote: createNote };

  return (
    <div
      className="fixed inset-x-0 top-0 flex h-dvh overflow-hidden bg-sidebar"
      style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
    >
      <AppearanceSync />
      {/* Reminders, sharing and widgets run on the phone, never in a browser it serves. */}
      {libraryReady && !browser && <ReminderRunner />}
      {libraryReady && !browser && <ShareSessionsRunner />}
      {libraryReady && !browser && <WidgetPublisher />}
      {browser && <PhoneStatusBanner />}
      <ModelPacksRunner />
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

      {/* Phones and tablets: a drawer over dimmed content, dismissed by tap or swipe. A dim,
          not a blur: re-blurring the whole screen every frame is what made it stutter on phones.
          It stays mounted off screen, so opening is only a slide; building the sidebar at the
          tap is what made it seem to hang. */}
      {!isDesktop && (
        <div
          className={cn("fixed inset-0 z-40 flex", !drawerOpen && "pointer-events-none")}
          inert={!drawerOpen}
          aria-hidden={!drawerOpen}
        >
          <motion.button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black/35 will-change-[opacity]"
            initial={false}
            animate={{ opacity: drawerOpen ? 1 : 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
            onClick={() => setDrawerOpen(false)}
          />
          <motion.div
            className="relative flex w-[min(86vw,340px)] bg-sidebar will-change-transform [contain:layout_paint]"
            initial={false}
            animate={{
              x: drawerOpen ? 0 : rtl ? "105%" : "-105%",
            }}
            transition={reducedMotion ? { duration: 0 } : spring.smooth}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.5, right: 0.04 }}
            onDragEnd={(_, info) => {
              if (
                (rtl ? info.offset.x > 80 : info.offset.x < -80) ||
                (rtl ? info.velocity.x > 500 : info.velocity.x < -500)
              )
                setDrawerOpen(false);
            }}
          >
            <Sidebar {...sidebarProps} className="w-full pt-[env(safe-area-inset-top)]" />
          </motion.div>
        </div>
      )}

      <div
        data-navigation-surface
        data-bottom-navigation={(isPhone && showTabBar && !viewport?.keyboardOpen) || undefined}
        className={cn(
          "app-ground flex min-w-0 grow overflow-hidden lg:my-2 lg:mr-2 lg:rounded-3xl lg:border lg:border-separator/30",
          // With the sidebar tucked away, the card sits evenly inside the window.
          collapsed && "lg:ml-2",
        )}
      >
        {!fullPage &&
          !(isPhone && detailOpen) &&
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
            "relative min-h-0 min-w-0 grow flex-col",
            !fullPage && "bg-paper",
            detailOpen ? "flex" : "hidden md:flex",
          )}
        >
          {/* Shared surfaces own navigation motion; the surrounding chrome stays live. */}
          <StudioHost>
            <TranscriptionProvider service={transcription}>
              <motion.div
                key={
                  nativeTransitions
                    ? "navigation"
                    : `${pathname}:${pathname === "/" ? (viewId ?? "workspace") : ""}`
                }
                className="flex min-h-0 grow flex-col"
                initial={reducedMotion || nativeTransitions ? false : { y: 6, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                transition={spring.smooth}
              >
                <Outlet />
              </motion.div>
            </TranscriptionProvider>
          </StudioHost>
        </main>
      </div>

      {/* On phones an open note's toolbar takes the bottom edge. */}
      {!viewport?.keyboardOpen && (!isPhone || showTabBar) && (
        <MiniPlayer className="fixed inset-x-3 bottom-[calc(max(14px,env(safe-area-inset-bottom))+58px)] z-30 md:right-6 md:bottom-6 md:left-auto md:w-[340px]" />
      )}

      {isPhone && showTabBar && !folder && !inCalendar && !viewport?.keyboardOpen && (
        <TabBar
          className={drawerOpen ? "invisible" : undefined}
          active={
            inWallet
              ? "wallet"
              : inBooks || location === "books"
                ? browser
                  ? "books"
                  : null
                : inCalendar
                  ? null
                  : inInvoices
                    ? "invoices"
                    : inSettings
                      ? "settings"
                      : "notes"
          }
        />
      )}
    </div>
  );
}
