import { describe, expect, it } from "bun:test";
import { gatherPeople, type ShareSnapshot } from "../../../src/features/connections/model/people";
import {
  OWNER,
  type ShareCredentials,
  type ShareMember,
} from "../../../src/features/sharing/model/share";

const share = (noteId: string, role: "owner" | "member", extra: Partial<ShareCredentials> = {}) =>
  ({
    noteId,
    shareId: `s-${noteId}`,
    key: "k",
    inviteId: role === "owner" ? OWNER : `me-${noteId}`,
    secret: "x",
    name: "Me",
    role,
    addedAt: 50,
    ...extra,
  }) satisfies ShareCredentials;

const member = (name: string, extra: Partial<ShareMember> = {}): ShareMember => ({
  name,
  secretHash: "h",
  invitedAt: 100,
  joinedAt: 200,
  revokedAt: null,
  ...extra,
});

describe("gathering people", () => {
  it("joins the same name across notes into one person", () => {
    const snapshots: ShareSnapshot[] = [
      { share: share("a", "owner"), members: [["i1", member("Ana")]], peers: [] },
      { share: share("b", "owner"), members: [["i2", member(" ana ")]], peers: [] },
    ];
    const [ana, ...rest] = gatherPeople(snapshots);
    expect(rest).toEqual([]);
    expect(ana?.notes.map((note) => [note.noteId, note.relation, note.inviteId])).toEqual([
      ["a", "invited", "i1"],
      ["b", "invited", "i2"],
    ]);
  });

  it("leaves out this device, removed people and nameless invitations", () => {
    const snapshots: ShareSnapshot[] = [
      {
        share: share("a", "member"),
        members: [
          ["me-a", member("Me")],
          ["gone", member("Ben", { revokedAt: 300 })],
          ["blank", member("  ")],
        ],
        peers: [],
      },
    ];
    expect(gatherPeople(snapshots).map((person) => person.name)).toEqual([]);
  });

  it("names a guest's inviter from the invitation, or their device when online", () => {
    const offline = gatherPeople([
      { share: share("a", "member", { from: "Kato" }), members: [], peers: [] },
    ]);
    expect(offline.map((p) => [p.name, p.online, p.notes[0]?.relation])).toEqual([
      ["Kato", false, "invitedYou"],
    ]);
    const online = gatherPeople([
      {
        share: share("a", "member"),
        members: [],
        peers: [{ inviteId: OWNER, name: "Kato Musa" }],
      },
    ]);
    expect(online.map((p) => [p.name, p.online, p.liveOn])).toEqual([["Kato Musa", true, ["a"]]]);
  });

  it("lists people online first, then by name", () => {
    const snapshots: ShareSnapshot[] = [
      {
        share: share("a", "owner"),
        members: [
          ["1", member("Zed")],
          ["2", member("Ana")],
          ["3", member("Moe")],
        ],
        peers: [{ inviteId: "1", name: "Zed" }],
      },
    ];
    expect(gatherPeople(snapshots).map((p) => p.name)).toEqual(["Zed", "Ana", "Moe"]);
  });
});
