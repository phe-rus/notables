import { cn } from "@notables/ui";
import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NotesList } from "../features/library/notes-list";
import { Sidebar } from "../features/library/sidebar";
import { getView } from "../features/library/views";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => setSidebarOpen(false), [viewId, note?.params.noteId]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar active={view.id} className="hidden lg:flex" />

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 flex lg:hidden">
          <Sidebar
            active={view.id}
            className="pt-[max(18px,env(safe-area-inset-top))] shadow-2xl"
          />
          <button
            type="button"
            aria-label="Close library"
            className="grow bg-black/25 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <NotesList
        view={view}
        activeId={note?.params.noteId}
        onOpenSidebar={() => setSidebarOpen(true)}
        className={cn(note ? "hidden md:flex" : "flex")}
      />

      <main className={cn("min-w-0 grow flex-col bg-paper", note ? "flex" : "hidden md:flex")}>
        <Outlet />
      </main>
    </div>
  );
}
