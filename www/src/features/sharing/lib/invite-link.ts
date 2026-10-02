import type { NoteKind } from "@notables/core";
import { publicUrl } from "../../../platform/public-url";
import type { Invitation } from "../model/share";

const FIELDS = {
  noteId: "n",
  key: "k",
  inviteId: "i",
  secret: "s",
  name: "w",
  from: "f",
  title: "t",
  kind: "c",
  origin: "o",
} as const;

/**
 * A link that opens the invitation. Everything secret sits after the #,
 * which browsers never send to servers.
 */
export function invitationLink(invitation: Invitation): string {
  const params = new URLSearchParams();
  for (const [field, short] of Object.entries(FIELDS)) {
    params.set(short, String(invitation[field as keyof typeof FIELDS]));
  }
  return `${publicUrl(`/s/${invitation.shareId}`)}#${params.toString()}`;
}

export function readInvitation(shareId: string, hash: string): Invitation | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const value = (field: keyof typeof FIELDS) => params.get(FIELDS[field]) ?? "";
  const invitation: Invitation = {
    shareId,
    noteId: value("noteId"),
    key: value("key"),
    inviteId: value("inviteId"),
    secret: value("secret"),
    name: value("name"),
    from: value("from"),
    title: value("title"),
    kind: (value("kind") || "note") as NoteKind,
    origin: value("origin"),
  };
  return invitation.noteId && invitation.key && invitation.inviteId && invitation.secret
    ? invitation
    : null;
}
