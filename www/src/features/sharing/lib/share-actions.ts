import { getAuthorName } from "../../../platform/author-preferences";
import { getDeviceId } from "../../../platform/device-identity";
import type { LibraryEntry } from "../../library/store/library-store";
import { getLibrary } from "../../library/store/library-store";
import { type Invitation, OWNER, type ShareCredentials } from "../model/share";
import { forgetShare, saveShare, shareFor } from "../store/share-store";
import { invitationLink } from "./invite-link";
import { newShareKey, randomToken, sha256Hex } from "./share-crypto";
import { membersOf } from "./share-members";
import { sessionFor, syncShareSessions } from "./share-sessions";

/** Makes a note shareable from this device, which becomes its owner. */
export function startSharing(entry: LibraryEntry, name: string): ShareCredentials {
  const existing = shareFor(entry.id);
  if (existing) return existing;
  const share: ShareCredentials = {
    noteId: entry.id,
    shareId: randomToken(16),
    key: newShareKey(),
    inviteId: OWNER,
    secret: randomToken(24),
    name: name.trim() || getAuthorName() || "Me",
    role: "owner",
    addedAt: Date.now(),
    invites: {},
  };
  saveShare(share);
  syncShareSessions();
  return share;
}

/** Invites one person, returning the link that only they should open. */
export async function invitePerson(entry: LibraryEntry, name: string): Promise<string> {
  const share = shareFor(entry.id);
  const session = sessionFor(entry.id);
  if (!share || share.role !== "owner" || !session) throw new Error("This note isn’t shared yet.");
  await session.ready;
  const inviteId = randomToken(9);
  const secret = randomToken(24);
  membersOf(session.doc).set(inviteId, {
    name: name.trim(),
    secretHash: await sha256Hex(secret),
    invitedAt: Date.now(),
    joinedAt: null,
    revokedAt: null,
  });
  saveShare({ ...share, invites: { ...share.invites, [inviteId]: secret } });
  return linkFor(entry, inviteId) ?? "";
}

/** The invitation link for someone already invited, on the owner's device. */
export function linkFor(entry: LibraryEntry, inviteId: string): string | null {
  const share = shareFor(entry.id);
  const session = sessionFor(entry.id);
  const secret = share?.invites?.[inviteId];
  const member = session ? membersOf(session.doc).get(inviteId) : undefined;
  if (!share || !secret || !member) return null;
  const invitation: Invitation = {
    shareId: share.shareId,
    noteId: entry.id,
    key: share.key,
    inviteId,
    secret,
    name: member.name,
    from: share.name,
    title: entry.title,
    kind: entry.kind,
    origin: entry.origin,
  };
  return invitationLink(invitation);
}

/** Stops sharing with one person; their device disconnects and stops syncing. */
export function removePerson(noteId: string, inviteId: string) {
  const session = sessionFor(noteId);
  const members = session && membersOf(session.doc);
  const member = members?.get(inviteId);
  if (members && member) members.set(inviteId, { ...member, revokedAt: Date.now() });
}

/**
 * Owner: stops sharing with everyone. Member: leaves, keeping their copy.
 * Either way the note stays on this device as an ordinary note.
 */
export async function stopSharing(noteId: string) {
  const share = shareFor(noteId);
  const session = sessionFor(noteId);
  if (share && session) {
    await session.ready;
    const members = membersOf(session.doc);
    const now = Date.now();
    if (share.role === "owner") {
      for (const [inviteId, member] of members.entries()) {
        if (inviteId !== OWNER && !member.revokedAt)
          members.set(inviteId, { ...member, revokedAt: now });
      }
    } else {
      const mine = members.get(share.inviteId);
      if (mine) members.set(share.inviteId, { ...mine, revokedAt: now });
    }
    // Give the change a moment to reach anyone connected.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  forgetShare(noteId);
  syncShareSessions();
}

/** Opens an invitation on this device: adds the note and starts syncing it. */
export function acceptInvitation(invitation: Invitation): LibraryEntry {
  const entry = getLibrary().receive({
    id: invitation.noteId,
    kind: invitation.kind,
    title: invitation.title,
    // Never this device: its empty copy must not seed the note.
    origin: invitation.origin || `shared-by-${invitation.shareId}`,
  });
  if (!shareFor(invitation.noteId)) {
    saveShare({
      noteId: invitation.noteId,
      shareId: invitation.shareId,
      key: invitation.key,
      inviteId: invitation.inviteId,
      secret: invitation.secret,
      name: invitation.name || getAuthorName() || "Guest",
      role: "member",
      addedAt: Date.now(),
    });
  }
  syncShareSessions();
  return entry;
}

export const isOwnDevice = (origin: string) => origin === getDeviceId();
