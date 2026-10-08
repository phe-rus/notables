import type { Reaction } from "@notables/core";
import { cn, HeartIcon, riseMotion, StarIcon, ThumbsUpIcon } from "@ultrapeach/ui";
import { motion } from "motion/react";
import type { PublicationStats } from "../../../server/publications/publications.service";

const STARS = [1, 2, 3, 4, 5] as const;

export interface ReactionsBarProps {
  stats: PublicationStats;
  reactions: Reaction[];
  rating: number | null;
  onToggleReaction: (reaction: Reaction) => void;
  onRate: (stars: number) => void;
}

/** The floating bar under a published piece: heart, like and a 1–5 star rating. */
export function ReactionsBar({
  stats,
  reactions,
  rating,
  onToggleReaction,
  onRate,
}: ReactionsBarProps) {
  const hearted = reactions.includes("heart");
  const liked = reactions.includes("like");
  const shownRating = rating ?? Math.round(stats.rating ?? 0);

  return (
    <motion.nav
      {...riseMotion}
      aria-label="Reactions"
      className="glass fixed inset-x-3 bottom-[max(16px,env(safe-area-inset-bottom))] mx-auto flex max-w-[460px] items-center justify-between rounded-full px-2 py-1.5"
    >
      <button
        type="button"
        aria-pressed={hearted}
        aria-label={`Heart · ${stats.hearts}`}
        onClick={() => onToggleReaction("heart")}
        className={cn(
          "group flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-full px-3 text-subheadline font-semibold transition-[background-color,transform] active:scale-95",
          hearted
            ? "bg-[#ffe7ec] text-[#c4123a] dark:bg-[#3d1720] dark:text-[#ff8fa6]"
            : "text-label hover:bg-fill",
        )}
      >
        <HeartIcon filled={hearted} className={cn(hearted && "text-heart")} />
        <span aria-hidden="true">{stats.hearts}</span>
      </button>
      <button
        type="button"
        aria-pressed={liked}
        aria-label={`Like · ${stats.likes}`}
        onClick={() => onToggleReaction("like")}
        className={cn(
          "group flex h-11 min-w-14 items-center justify-center gap-1.5 rounded-full px-3 text-subheadline transition-[background-color,transform] active:scale-95",
          liked ? "bg-accent-soft font-semibold text-accent-text" : "text-label hover:bg-fill",
        )}
      >
        <ThumbsUpIcon filled={liked} />
        <span aria-hidden="true">{stats.likes}</span>
      </button>
      <fieldset className="flex items-center gap-0.5" aria-label="Rate this">
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={rating === star}
            onClick={() => onRate(star)}
            className="group flex size-8 items-center justify-center rounded-full text-[#b37a00] transition-transform hover:bg-fill active:scale-90 dark:text-accent"
          >
            <StarIcon filled={shownRating >= star} />
          </button>
        ))}
      </fieldset>
    </motion.nav>
  );
}
