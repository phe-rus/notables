import type { NoteKind } from "@notables/core";
import {
  ArticleIcon,
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
  TrafficLights,
} from "@notables/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { isTauri } from "../../platform/runtime";
import { useLibrary } from "./library";
import { type ViewId, views } from "./views";

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

export function Sidebar({ active, className }: { active: ViewId; className?: string }) {
  const entries = useLibrary();
  const count = (id: ViewId) =>
    entries.filter((e) =>
      id === "all" ? true : id === "published" ? e.publicationId : e.kind === (id as NoteKind),
    ).length;

  return (
    <nav
      aria-label="Library"
      className={cn(
        "flex w-[248px] shrink-0 flex-col gap-[22px] overflow-y-auto border-r border-separator bg-sidebar px-3 pt-[18px] pb-6",
        className,
      )}
    >
      {isTauri() && navigator.userAgent.includes("Mac") ? <TrafficLights /> : <Wordmark />}
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
          Share with family and friends once Pherus accounts arrive.
        </p>
      </SidebarSection>
    </nav>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="flex size-7 items-center justify-center rounded-[8px] bg-accent text-on-accent">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 19V5l12 14V5" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Notables</span>
    </div>
  );
}
