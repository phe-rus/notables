import { OWNER, type ShareCredentials, type ShareMember } from "../../sharing/model/share";

/** One note shared with a person, and how. */
export interface SharedNote {
  noteId: string;
  /** "invited": this device invited them; "invitedYou": they shared it with you; "together": both are guests. */
  relation: "invited" | "invitedYou" | "together";
  /** The person's invitation, so the owner can copy the link again or remove them. */
  inviteId: string | null;
  joined: boolean;
}

/**
 * Someone this device shares notes with. People are known by the name
 * their invitation carries, so the same name across notes is one person,
 * until accounts give everyone a real identity.
 */
export interface Person {
  key: string;
  name: string;
  /** Connected to this device right now, on any shared note. */
  online: boolean;
  /** Which notes they are connected on right now. */
  liveOn: string[];
  notes: SharedNote[];
  /** When they were first invited or first invited you. */
  since: number;
}

/** What one shared note knows about its people. */
export interface ShareSnapshot {
  share: ShareCredentials;
  members: ReadonlyArray<[string, ShareMember]>;
  /** Devices connected now: their invitation and the name they gave. */
  peers: ReadonlyArray<{ inviteId: string; name: string }>;
}

export const personKey = (name: string) => name.trim().toLocaleLowerCase();

/** Everyone across this device's shared notes, online people first, then by name. */
export function gatherPeople(snapshots: readonly ShareSnapshot[]): Person[] {
  const people = new Map<string, Person>();
  const add = (name: string, note: SharedNote, since: number, live: boolean) => {
    const clean = name.trim();
    if (!clean) return;
    const key = personKey(clean);
    const person = people.get(key) ?? {
      key,
      name: clean,
      online: false,
      liveOn: [],
      notes: [],
      since,
    };
    if (!person.notes.some((existing) => existing.noteId === note.noteId)) {
      person.notes.push(note);
    }
    person.since = Math.min(person.since, since);
    if (live && !person.liveOn.includes(note.noteId)) {
      person.online = true;
      person.liveOn.push(note.noteId);
    }
    people.set(key, person);
  };

  for (const { share, members, peers } of snapshots) {
    const onlineInvites = new Set(peers.map((peer) => peer.inviteId));
    const mine = share.inviteId;
    for (const [inviteId, member] of members) {
      if (inviteId === mine || member.revokedAt) continue;
      add(
        member.name,
        {
          noteId: share.noteId,
          relation: share.role === "owner" ? "invited" : "together",
          inviteId: share.role === "owner" ? inviteId : null,
          joined: Boolean(member.joinedAt),
        },
        member.invitedAt,
        onlineInvites.has(inviteId),
      );
    }
    // A guest's inviter: named by the invitation, or by their device when it connects.
    if (share.role === "member") {
      const owner = peers.find((peer) => peer.inviteId === OWNER);
      add(
        owner?.name || share.from || "",
        { noteId: share.noteId, relation: "invitedYou", inviteId: null, joined: true },
        share.addedAt,
        Boolean(owner),
      );
    }
  }

  return [...people.values()].sort(
    (a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
  );
}
