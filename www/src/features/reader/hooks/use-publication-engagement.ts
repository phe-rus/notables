import type { Reaction } from "@notables/core";
import { type RefObject, useCallback, useEffect, useState } from "react";
import { getDeviceId } from "../../../platform/device-identity";
import {
  getViewerState,
  ratePublication,
  reactToPublication,
  recordRead,
  recordView,
} from "../../../server/publications/publications.functions";
import type { PublicationStats } from "../../../server/publications/publications.service";
import { oncePerSession } from "../lib/once-per-session";

interface ViewerState {
  reactions: Reaction[];
  rating: number | null;
}

const statKey = { heart: "hearts", like: "likes" } as const;

/**
 * Reader-side engagement: counts the view, counts a read when `endRef`
 * scrolls into view, and exposes optimistic reactions and ratings.
 */
export function usePublicationEngagement(
  publicationId: string,
  initialStats: PublicationStats,
  endRef: RefObject<HTMLElement | null>,
) {
  const [stats, setStats] = useState(initialStats);
  const [viewer, setViewer] = useState<ViewerState>({ reactions: [], rating: null });

  useEffect(() => {
    const id = publicationId;
    if (oncePerSession(`notables:viewed:${id}`)) void recordView({ data: { id } });
    getViewerState({ data: { id, viewerId: getDeviceId() } })
      .then(setViewer)
      .catch(() => {});

    const sentinel = endRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && oncePerSession(`notables:read:${id}`)) {
        void recordRead({ data: { id } });
        observer.disconnect();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [publicationId, endRef]);

  const toggleReaction = useCallback(
    async (reaction: Reaction) => {
      const on = !viewer.reactions.includes(reaction);
      const delta = on ? 1 : -1;
      const apply = (sign: number) => {
        setViewer((v) => ({
          ...v,
          reactions:
            sign * delta > 0
              ? [...v.reactions, reaction]
              : v.reactions.filter((r) => r !== reaction),
        }));
        setStats((s) => ({ ...s, [statKey[reaction]]: s[statKey[reaction]] + sign * delta }));
      };
      apply(1);
      try {
        setStats(
          await reactToPublication({
            data: { id: publicationId, viewerId: getDeviceId(), reaction, on },
          }),
        );
      } catch {
        apply(-1);
      }
    },
    [publicationId, viewer.reactions],
  );

  const rate = useCallback(
    async (stars: number) => {
      const previous = viewer.rating;
      setViewer((v) => ({ ...v, rating: stars }));
      try {
        setStats(
          await ratePublication({ data: { id: publicationId, viewerId: getDeviceId(), stars } }),
        );
      } catch {
        setViewer((v) => ({ ...v, rating: previous }));
      }
    },
    [publicationId, viewer.rating],
  );

  return { stats, viewer, toggleReaction, rate };
}
