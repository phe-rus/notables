-- Public, server-authoritative side of Notables (ADR-0003).
-- Counters are denormalised onto publications and updated in the same
-- batch as the detail rows they summarise.

CREATE TABLE publications (
  id              TEXT PRIMARY KEY,
  note_id         TEXT NOT NULL UNIQUE,
  -- SHA-256 of the secret key held by the publishing device (ADR-0005).
  key_hash        TEXT NOT NULL,
  kind            TEXT NOT NULL,
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL,
  author_name     TEXT NOT NULL,
  reading_minutes INTEGER NOT NULL,
  published_at    INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  view_count      INTEGER NOT NULL DEFAULT 0,
  read_count      INTEGER NOT NULL DEFAULT 0,
  like_count      INTEGER NOT NULL DEFAULT 0,
  heart_count     INTEGER NOT NULL DEFAULT 0,
  rating_sum      INTEGER NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX publications_recent ON publications (published_at DESC);

CREATE TABLE reactions (
  publication_id TEXT NOT NULL REFERENCES publications (id) ON DELETE CASCADE,
  viewer_id      TEXT NOT NULL,
  reaction       TEXT NOT NULL CHECK (reaction IN ('like', 'heart')),
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (publication_id, viewer_id, reaction)
);

CREATE TABLE ratings (
  publication_id TEXT NOT NULL REFERENCES publications (id) ON DELETE CASCADE,
  viewer_id      TEXT NOT NULL,
  stars          INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (publication_id, viewer_id)
);
