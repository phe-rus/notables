import { z } from "zod";
import { gatherPeople } from "@/features/connections/model/people";
import { getLibrary } from "@/features/library/store/library-store";
import { getAuthorName } from "@/platform/author-preferences";
import { getShares, shareFor } from "../store/share-store";
import { invitePerson, linkFor, removePerson, startSharing, stopSharing } from "./share-actions";
import { activeMembers, membersOf } from "./share-members";
import { sessionFor } from "./share-sessions";

const Target = z.object({ noteId: z.string().min(1).max(64) });
const Invite = Target.extend({ name: z.string().trim().min(1).max(60) });
/** Only explicit sharing actions are available to an approved browser. Keys stay on the phone. */
export async function browserShareRequest(method: string, input: unknown): Promise<unknown> {
  if (method === "sharing.people")
    return gatherPeople(
      getShares().map((share) => {
        const session = sessionFor(share.noteId);
        return {
          share,
          members: session ? activeMembers(session.doc) : [],
          peers: session?.peers ?? [],
        };
      }),
    );
  if (method === "sharing.status") {
    const { noteId } = Target.parse(input);
    const share = shareFor(noteId);
    const session = sessionFor(noteId);
    if (session) await session.ready;
    return {
      role: share?.role ?? "unshared",
      mine: share?.inviteId ?? "",
      online: session?.peers.map((peer) => peer.inviteId) ?? [],
      members: session
        ? [...membersOf(session.doc)]
            .filter(([, member]) => !member.revokedAt)
            .map(([id, member]) => [
              id,
              {
                name: member.name,
                invitedAt: member.invitedAt,
                joinedAt: member.joinedAt,
                revokedAt: member.revokedAt,
              },
            ])
        : [],
    };
  }
  if (method === "sharing.link" || method === "sharing.remove") {
    const { noteId, inviteId } = Target.extend({ inviteId: z.string().min(1).max(64) }).parse(
      input,
    );
    const entry = getLibrary().get(noteId);
    if (!entry || shareFor(noteId)?.role !== "owner") throw new Error("not-owner");
    if (method === "sharing.link") return linkFor(entry, inviteId);
    removePerson(noteId, inviteId);
    return null;
  }
  if (method === "sharing.invite") {
    const { noteId, name } = Invite.parse(input);
    const entry = getLibrary().get(noteId);
    if (!entry || entry.trashedAt) throw new Error("note-unavailable");
    const share = shareFor(noteId);
    if (share?.role === "member") throw new Error("not-owner");
    if (!share) startSharing(entry, getAuthorName());
    return invitePerson(entry, name);
  }
  if (method === "sharing.stop") {
    const { noteId } = Target.parse(input);
    await stopSharing(noteId);
    return null;
  }
  throw new Error("unsupported-request");
}
