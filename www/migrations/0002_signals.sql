-- Peer-to-peer sharing (ADR-0006): a short-lived mailbox where devices
-- holding the same shared note introduce themselves to each other. Rooms
-- are hashes and payloads are encrypted with the share's key, so the
-- server never sees which note is shared or anything in it.

CREATE TABLE signals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room       TEXT NOT NULL,
  sender     TEXT NOT NULL,
  -- NULL reaches everyone in the room.
  recipient  TEXT,
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX signals_room ON signals (room, id);
CREATE INDEX signals_age ON signals (created_at);
