import type * as Y from "yjs";
import type { ShareMember } from "../model/share";

/** The people a note is shared with, kept inside the note so every copy agrees. */
export function membersOf(doc: Y.Doc): Y.Map<ShareMember> {
  return doc.getMap<ShareMember>("share-members");
}

export function activeMembers(doc: Y.Doc): Array<[string, ShareMember]> {
  return [...membersOf(doc).entries()].filter(([, member]) => !member.revokedAt);
}
