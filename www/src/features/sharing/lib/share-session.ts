import { Awareness, type ConnectedPeer, PeerMesh, type PersistenceBinding } from "@notables/sync";

import * as Y from "yjs";
import { getDeviceId } from "../../../platform/device-identity";
import { getPersistence } from "../../../platform/storage/document-storage";
import { OWNER, type ShareCredentials } from "../model/share";
import { forgetShare } from "../store/share-store";
import { MailboxSignaling } from "./mailbox-signaling";
import { sha256Hex } from "./share-crypto";
import { membersOf } from "./share-members";

type Listener = () => void;

/**
 * Keeps one shared note in step with the other devices that hold it, for
 * as long as the app is open. It owns the note's document while running;
 * an open editor joins it through a bridge rather than loading its own.
 */
export class ShareSession {
  readonly doc = new Y.Doc();
  readonly ready: Promise<void>;
  #binding: PersistenceBinding | null = null;
  #mesh: PeerMesh | null = null;
  #listeners = new Set<Listener>();
  #peers: ConnectedPeer[] = [];
  #stopped = false;
  /** Set when this device's own invitation is withdrawn. */
  removed = false;

  constructor(readonly share: ShareCredentials) {
    this.ready = this.#start();
  }

  get peers() {
    return this.#peers;
  }

  subscribe(listener: Listener) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #emit() {
    for (const listener of this.#listeners) listener();
  }

  async #start() {
    this.#binding = await getPersistence().bind(`note:${this.share.noteId}`, this.doc);
    if (this.#stopped) {
      this.#binding.destroy();
      return;
    }
    const members = membersOf(this.doc);
    // The person who shared signs themselves in as the owner.
    if (this.share.role === "owner" && !members.has(OWNER)) {
      members.set(OWNER, {
        name: this.share.name,
        secretHash: await sha256Hex(this.share.secret),
        invitedAt: this.share.addedAt,
        joinedAt: this.share.addedAt,
        revokedAt: null,
      });
    }

    // A fresh id per run, so a device that reconnects is a new peer.
    const selfId = `${getDeviceId().slice(-12)}-${Math.random().toString(36).slice(2, 10)}`;
    const awareness = new Awareness(this.doc);
    awareness.setLocalStateField("user", { name: this.share.name });
    const mesh = new PeerMesh(
      selfId,
      this.doc,
      awareness,
      new MailboxSignaling(this.share.shareId, this.share.key, selfId),
      {
        hello: {
          type: "hello",
          inviteId: this.share.inviteId,
          secret: this.share.secret,
          name: this.share.name,
        },
        verify: async (hello) => {
          const member = members.get(hello.inviteId);
          // A brand-new copy hasn't received the member list yet; the owner's
          // device always has it and checks everyone, so let it through.
          if (!member) return members.size === 0 ? true : "Not invited";
          if (member.revokedAt) return "No longer shared with this person";
          return (await sha256Hex(hello.secret)) === member.secretHash ? true : "Wrong invitation";
        },
      },
    );
    mesh.on("peers", (peers) => {
      this.#peers = peers;
      this.#emit();
    });
    this.#mesh = mesh;

    // Note when this person first arrives, and react to withdrawn invitations.
    const watch = () => {
      const mine = members.get(this.share.inviteId);
      if (mine && !mine.joinedAt)
        members.set(this.share.inviteId, { ...mine, joinedAt: Date.now() });
      if (mine?.revokedAt) {
        this.removed = true;
        forgetShare(this.share.noteId);
        this.stop();
      }
      // Let the removal itself reach that device first, so it knows it was removed.
      const revoked = [...members.entries()].filter(([, member]) => member.revokedAt);
      if (revoked.length > 0) {
        setTimeout(() => {
          for (const [inviteId] of revoked) mesh.disconnect(inviteId);
        }, 1500);
      }
      this.#emit();
    };
    members.observe(watch);
    watch();
    if (!this.#stopped) mesh.start();
  }

  stop() {
    if (this.#stopped) return;
    this.#stopped = true;
    this.#mesh?.stop();
    this.#binding?.destroy();
    this.#peers = [];
    this.#emit();
  }
}
