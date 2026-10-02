import type { NoteKind } from "@notables/core";

/** The owner's own invitation id. */
export const OWNER = "owner";

/**
 * What this device needs to take part in a shared note. Kept on the
 * device only; the key and secret never reach a server.
 */
export interface ShareCredentials {
  noteId: string;
  /** Names the shared note's signalling room, together with the key. */
  shareId: string;
  /** AES-GCM key that seals everything sent through signalling. */
  key: string;
  /** Which invitation this device joined with, or OWNER. */
  inviteId: string;
  /** Proves the invitation; shown to other devices when connecting. */
  secret: string;
  /** How this device's person is named to the others. */
  name: string;
  role: "owner" | "member";
  addedAt: number;
  /** Owner only: each invitation's secret, so its link can be copied again. */
  invites?: Record<string, string>;
}

/** A person a note is shared with, as listed inside the note itself. */
export interface ShareMember {
  name: string;
  /** SHA-256 of the invitation secret. */
  secretHash: string;
  invitedAt: number;
  joinedAt: number | null;
  revokedAt: number | null;
}

/** Everything an invitation link carries, in its #fragment (never sent to servers). */
export interface Invitation {
  shareId: string;
  noteId: string;
  key: string;
  inviteId: string;
  secret: string;
  /** Who it's for. */
  name: string;
  /** Who sent it. */
  from: string;
  title: string;
  kind: NoteKind;
  /** Device the note started on, so the invited device doesn't seed it. */
  origin: string;
}
