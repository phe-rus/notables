import { DocumentView } from "@notables/editor";
import { Chip, cn, HeartIcon, StarIcon, ThumbsUpIcon } from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDeviceId } from "../../platform/identity";
import {
  getViewerState,
  ratePublication,
  reactToPublication,
  recordRead,
  recordView,
} from "../../server/functions";
import type { Publication, PublicationStats } from "../../server/publications";

const kindLabel: Record<Publication["kind"], string> = {
  note: "Note",
  journal: "Journal",
  story: "Short story",
  article: "Article",
  manga: "Manga",
  lesson: "Lesson",
  plan: "Plan",
};

function once(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // Without storage, count every visit.
  }
  return true;
}

interface SerializedBlock {
  type?: string;
  text?: string;
  children?: SerializedBlock[];
}

const textOf = (node: SerializedBlock): string =>
  node.text ?? (node.children ?? []).map(textOf).join("");

/** The first line of a note is its title, shown in the header: don't repeat it. */
function withoutLeadingTitle(document: unknown, title: string): unknown {
  const root = (document as { root?: SerializedBlock })?.root;
  const [first, ...rest] = root?.children ?? [];
  if (!root || !first || first.type !== "heading" || textOf(first).trim() !== title.trim()) {
    return document;
  }
  return { ...(document as object), root: { ...root, children: rest } };
}

export function ReaderPage({
  publication,
  document,
}: {
  publication: Publication;
  document: string;
}) {
  const parsed = useMemo(
    () => withoutLeadingTitle(JSON.parse(document), publication.title),
    [document, publication.title],
  );
  const [stats, setStats] = useState<PublicationStats>(publication.stats);
  const [mine, setMine] = useState<{ reactions: string[]; rating: number | null }>({
    reactions: [],
    rating: null,
  });
  const end = useRef<HTMLDivElement>(null);
  const id = publication.id;

  useEffect(() => {
    const viewerId = getDeviceId();
    if (once(`notables:viewed:${id}`)) void recordView({ data: { id } });
    void getViewerState({ data: { id, viewerId } })
      .then(setMine)
      .catch(() => {});

    const sentinel = end.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && once(`notables:read:${id}`)) {
        void recordRead({ data: { id } });
        observer.disconnect();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [id]);

  const toggle = async (reaction: "heart" | "like") => {
    const on = !mine.reactions.includes(reaction);
    setMine((m) => ({
      ...m,
      reactions: on ? [...m.reactions, reaction] : m.reactions.filter((r) => r !== reaction),
    }));
    setStats((s) => ({
      ...s,
      [reaction === "heart" ? "hearts" : "likes"]:
        s[reaction === "heart" ? "hearts" : "likes"] + (on ? 1 : -1),
    }));
    try {
      setStats(await reactToPublication({ data: { id, viewerId: getDeviceId(), reaction, on } }));
    } catch {
      setStats(publication.stats);
    }
  };

  const rate = async (stars: number) => {
    setMine((m) => ({ ...m, rating: stars }));
    try {
      setStats(await ratePublication({ data: { id, viewerId: getDeviceId(), stars } }));
    } catch {
      setMine((m) => ({ ...m, rating: null }));
    }
  };

  const published = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(publication.publishedAt);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-[#2a3a44] px-5 pt-[max(20px,env(safe-area-inset-top))] pb-6 text-white">
        <div className="mx-auto flex max-w-[680px] items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-[15px] font-semibold text-white no-underline"
          >
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-accent text-on-accent">
              <svg
                width="14"
                height="14"
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
            Notables
          </Link>
          <Chip className="bg-white/15 text-white">Public</Chip>
        </div>
        <p className="mx-auto mt-16 max-w-[680px] text-[12px] font-semibold tracking-[0.06em] text-[#e6eef2] uppercase">
          {kindLabel[publication.kind]} · {publication.readingMinutes} min read
        </p>
      </header>

      <main className="mx-auto flex max-w-[680px] flex-col gap-5 px-6 pt-7 pb-40">
        <h1 className="font-serif text-[36px] leading-[1.1] font-semibold tracking-tight text-label md:text-[44px]">
          {publication.title}
        </h1>
        <div className="flex items-center gap-2.5">
          <span className="flex size-[34px] items-center justify-center rounded-full bg-accent text-[14px] font-bold text-on-accent">
            {publication.authorName.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold">{publication.authorName}</span>
            <span className="text-[13px] text-label-secondary">
              Published {published}
              {stats.reads > 0 && ` · Read by ${stats.reads.toLocaleString()}`}
            </span>
          </div>
        </div>
        <DocumentView document={parsed} />
        <div ref={end} aria-hidden="true" />
      </main>

      <nav
        aria-label="Reactions"
        className="fixed inset-x-3 bottom-[max(16px,env(safe-area-inset-bottom))] mx-auto flex max-w-[460px] items-center justify-between rounded-[22px] bg-elevated px-2.5 py-2 shadow-[0_10px_30px_rgb(60_40_0/0.14),0_0_0_1px_var(--color-separator)]"
      >
        <button
          type="button"
          aria-pressed={mine.reactions.includes("heart")}
          aria-label={`Heart · ${stats.hearts}`}
          onClick={() => toggle("heart")}
          className={cn(
            "flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-[14px] px-3 text-[15px] font-semibold transition-[background-color,transform] active:scale-95",
            mine.reactions.includes("heart")
              ? "bg-[#ffe7ec] text-[#c4123a] dark:bg-[#3d1720] dark:text-[#ff8fa6]"
              : "text-label hover:bg-fill",
          )}
        >
          <HeartIcon
            filled={mine.reactions.includes("heart")}
            className={mine.reactions.includes("heart") ? "text-heart" : ""}
          />
          <span aria-hidden="true">{stats.hearts}</span>
        </button>
        <button
          type="button"
          aria-pressed={mine.reactions.includes("like")}
          aria-label={`Like · ${stats.likes}`}
          onClick={() => toggle("like")}
          className={cn(
            "flex h-11 min-w-14 items-center justify-center gap-1.5 rounded-[14px] px-3 text-[15px] transition-[background-color,transform] active:scale-95",
            mine.reactions.includes("like")
              ? "bg-accent-soft font-semibold text-accent-text"
              : "text-label hover:bg-fill",
          )}
        >
          <ThumbsUpIcon filled={mine.reactions.includes("like")} />
          <span aria-hidden="true">{stats.likes}</span>
        </button>
        <fieldset className="flex items-center gap-0.5" aria-label="Rate this">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = (mine.rating ?? Math.round(stats.rating ?? 0)) >= star;
            return (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                aria-pressed={mine.rating === star}
                onClick={() => rate(star)}
                className="flex size-8 items-center justify-center rounded-lg text-[#b37a00] transition-transform hover:bg-fill active:scale-90 dark:text-accent"
              >
                <StarIcon filled={filled} />
              </button>
            );
          })}
        </fieldset>
      </nav>
    </div>
  );
}
