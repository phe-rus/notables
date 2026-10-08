import { DocumentView } from "@notables/pluraliti";
import { Link } from "@tanstack/react-router";
import { Chip } from "@ultrapeach/ui";
import { useMemo, useRef } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { stripLeadingTitle } from "../../../lib/documents/strip-leading-title";
import type { Publication } from "../../../server/publications/publications.service";
import { noteKindLabels } from "../../library/model/note-kind-labels";
import { usePublicationEngagement } from "../hooks/use-publication-engagement";
import { ReactionsBar } from "./reactions-bar";

const publishedDate = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export interface ReaderPageProps {
  publication: Publication;
  /** The published document as JSON text. */
  document: string;
}

export function ReaderPage({ publication, document }: ReaderPageProps) {
  const content = useMemo(
    () => stripLeadingTitle(JSON.parse(document), publication.title),
    [document, publication.title],
  );
  const endOfStory = useRef<HTMLDivElement>(null);
  const { stats, viewer, toggleReaction, rate } = usePublicationEngagement(
    publication.id,
    publication.stats,
    endOfStory,
  );

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-[#2a3a44] px-5 pt-[max(20px,env(safe-area-inset-top))] pb-6 text-white">
        <div className="mx-auto flex max-w-[680px] items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-subheadline font-semibold text-white no-underline"
          >
            <AppMark />
            Notables
          </Link>
          <Chip className="bg-white/15 text-white">Public</Chip>
        </div>
        <p className="mx-auto mt-16 max-w-[680px] text-caption font-semibold tracking-[0.06em] text-[#e6eef2] uppercase">
          {noteKindLabels[publication.kind]} · {publication.readingMinutes} min read
        </p>
      </header>

      <main className="mx-auto flex max-w-[680px] flex-col gap-5 px-6 pt-7 pb-40">
        <h1 className="font-serif text-[36px] leading-[1.1] font-semibold tracking-tight text-label md:text-[44px]">
          {publication.title}
        </h1>
        <AuthorByline
          name={publication.authorName}
          publishedAt={publication.publishedAt}
          reads={stats.reads}
        />
        <DocumentView document={content} />
        <div ref={endOfStory} aria-hidden="true" />
      </main>

      <ReactionsBar
        stats={stats}
        reactions={viewer.reactions}
        rating={viewer.rating}
        onToggleReaction={toggleReaction}
        onRate={rate}
      />
    </div>
  );
}

function AuthorByline({
  name,
  publishedAt,
  reads,
}: {
  name: string;
  publishedAt: number;
  reads: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-[34px] items-center justify-center rounded-full bg-accent text-[14px] font-bold text-on-accent">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="flex flex-col">
        <span className="text-subheadline font-semibold">{name}</span>
        <span className="text-footnote text-label-secondary">
          Published {publishedDate.format(publishedAt)}
          {reads > 0 && ` · Read by ${reads.toLocaleString()}`}
        </span>
      </div>
    </div>
  );
}
