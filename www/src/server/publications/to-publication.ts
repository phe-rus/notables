import type { Publication, PublicationRecord } from "./types";

export function toPublication(row: PublicationRecord): Publication {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    excerpt: row.excerpt,
    authorName: row.author_name,
    readingMinutes: row.reading_minutes,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    stats: {
      views: row.view_count,
      reads: row.read_count,
      likes: row.like_count,
      hearts: row.heart_count,
      rating: row.rating_count ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : null,
      ratings: row.rating_count,
    },
  };
}
