-- Public, server-authoritative side of Notables (ADR-0003).
-- Counters are denormalised onto publications and kept in step with the
-- detail tables inside the same D1 batch.

CREATE TABLE publications (
  id            TEXT PRIMARY KEY,
  note_id       TEXT NOT NULL UNIQUE,
  author_id     TEXT NOT NULL,
  kind          TEXT NOT NULL,
  title         TEXT NOT NULL,
  excerpt       TEXT NOT NULL,
  published_at  INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  view_count    INTEGER NOT NULL DEFAULT 0,
  read_count    INTEGER NOT NULL DEFAULT 0,
  like_count    INTEGER NOT NULL DEFAULT 0,
  heart_count   INTEGER NOT NULL DEFAULT 0,
  rating_sum    INTEGER NOT NULL DEFAULT 0,
  rating_count  INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX publications_author ON publications (author_id, published_at DESC);
CREATE INDEX publications_recent ON publications (published_at DESC);

CREATE TABLE reactions (
  publication_id TEXT NOT NULL REFERENCES publications (id) ON DELETE CASCADE,
  account_id     TEXT NOT NULL,
  reaction       TEXT NOT NULL CHECK (reaction IN ('like', 'heart')),
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (publication_id, account_id, reaction)
);

CREATE TABLE ratings (
  publication_id TEXT NOT NULL REFERENCES publications (id) ON DELETE CASCADE,
  account_id     TEXT NOT NULL,
  stars          INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (publication_id, account_id)
);

CREATE TABLE comments (
  id             TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL REFERENCES publications (id) ON DELETE CASCADE,
  author_id      TEXT NOT NULL,
  parent_id      TEXT REFERENCES comments (id) ON DELETE CASCADE,
  body           TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE INDEX comments_publication ON comments (publication_id, created_at);
