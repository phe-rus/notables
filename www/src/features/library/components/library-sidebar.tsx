import type { NoteKind } from "@notables/core";
import {
  ArticleIcon,
  BookIcon,
  CanvasIcon,
  cn,
  GlobeIcon,
  JournalIcon,
  LessonIcon,
  NoteIcon,
  PlanIcon,
  SidebarItemContent,
  SidebarSection,
  StoryIcon,
  sidebarItemClass,
} from "@notables/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { isTauri } from "../../../platform/runtime";
import { useBooks } from "../../books/store/book-store";
import { type ViewId, views } from "../model/library-views";
import { useLibrary } from "../store/library-store";

const icons: Record<ViewId, ReactNode> = {
  all: <NoteIcon size={17} />,
  journal: <JournalIcon size={17} />,
  story: <StoryIcon size={17} />,
  article: <ArticleIcon size={17} />,
  manga: <CanvasIcon size={17} />,
  lesson: <LessonIcon size={17} />,
  plan: <PlanIcon size={17} />,
  note: <NoteIcon size={17} />,
  published: <GlobeIcon size={17} />,
};

const libraryViews = views.filter((v) => v.id !== "published");
const published = views.find((v) => v.id === "published");

export function Sidebar({ active, className }: { active: ViewId | "books"; className?: string }) {
  const books = useBooks();
  const entries = useLibrary();
  const count = (id: ViewId) =>
    entries.filter((e) =>
      id === "all" ? true : id === "published" ? e.publicationId : e.kind === (id as NoteKind),
    ).length;

  return (
    <nav
      aria-label="Library"
      className={cn(
        "flex w-[248px] shrink-0 flex-col gap-[22px] overflow-y-auto glass-pane border-r border-separator/70 px-3 pt-[18px] pb-6",
        className,
      )}
    >
      {isTauri() && navigator.userAgent.includes("Mac") ? (
        // The native traffic lights sit here; the strip lets the window be dragged.
        <div data-tauri-drag-region className="-mt-[18px] h-[34px] shrink-0" />
      ) : (
        <Wordmark />
      )}
      <SidebarSection title="Library">
        {libraryViews.map((view) => (
          <Link
            key={view.id}
            to="/"
            search={{ view: view.id === "all" ? undefined : view.id }}
            className={sidebarItemClass(active === view.id)}
          >
            <SidebarItemContent
              icon={icons[view.id]}
              count={count(view.id)}
              active={active === view.id}
            >
              {view.title}
            </SidebarItemContent>
          </Link>
        ))}
      </SidebarSection>
      <SidebarSection title="Shelf">
        <Link to="/books" className={sidebarItemClass(active === "books")}>
          <SidebarItemContent
            icon={<BookIcon size={17} />}
            count={books.length}
            active={active === "books"}
          >
            Books
          </SidebarItemContent>
        </Link>
      </SidebarSection>
      {published && (
        <SidebarSection title="Public">
          <Link
            to="/"
            search={{ view: "published" }}
            className={sidebarItemClass(active === "published")}
          >
            <SidebarItemContent
              icon={icons.published}
              count={count("published")}
              active={active === "published"}
            >
              {published.title}
            </SidebarItemContent>
          </Link>
        </SidebarSection>
      )}
      <SidebarSection title="Shared">
        <p className="px-2.5 text-[13px] leading-snug text-label-tertiary">
          Share directly with family and friends, device to device — coming soon.
        </p>
      </SidebarSection>
    </nav>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2 px-2">
      <AppMark />
      <span className="text-[15px] font-semibold tracking-tight">Notables</span>
    </div>
  );
}
