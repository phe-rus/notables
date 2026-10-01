import { can } from "@notables/core";
import type { Connection, ConnectionContext } from "partyserver";
import { YServer } from "y-partyserver";
import * as Y from "yjs";
import { AclUpdate, DocumentAcl, roleFor } from "./acl";
import { ACCOUNT_HEADER } from "./env";
import { DocumentStore } from "./storage";

const ACL_KEY = "acl";
const FORBIDDEN = 4403;

const tag = {
  account: (id: string) => `account:${id}`,
  role: (role: string) => `role:${role}`,
};

/**
 * The live, authoritative copy of one note's Yjs document. Devices and
 * collaborators connect over WebSocket; the state is persisted in the
 * object's own SQLite storage.
 */
export class NoteDocument extends YServer {
  static override options = { hibernate: true };
  static override callbackOptions = { debounceWait: 1000, debounceMaxWait: 5000 };

  #store?: DocumentStore;

  get store(): DocumentStore {
    this.#store ??= new DocumentStore(this.ctx.storage.sql);
    return this.#store;
  }

  get acl(): DocumentAcl | null {
    const raw = this.store.getMeta(ACL_KEY);
    return raw ? DocumentAcl.parse(JSON.parse(raw)) : null;
  }

  set acl(acl: DocumentAcl) {
    this.store.setMeta(ACL_KEY, JSON.stringify(acl));
  }

  override async onLoad(): Promise<void> {
    const state = this.store.loadState();
    if (state) Y.applyUpdate(this.document, state);
  }

  override async onSave(): Promise<void> {
    this.store.saveState(Y.encodeStateAsUpdate(this.document));
  }

  override getConnectionTags(_connection: Connection, ctx: ConnectionContext): string[] {
    const accountId = ctx.request.headers.get(ACCOUNT_HEADER);
    if (!accountId) return [];

    let acl = this.acl;
    if (!acl) {
      acl = { ownerId: accountId, grants: [] };
      this.acl = acl;
    }

    const role = roleFor(acl, accountId);
    return role ? [tag.account(accountId), tag.role(role)] : [tag.account(accountId)];
  }

  override async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    if (!connection.tags.some((t) => t.startsWith("role:"))) {
      connection.close(FORBIDDEN, "forbidden");
      return;
    }
    await super.onConnect(connection, ctx);
  }

  override isReadOnly(connection: Connection): boolean {
    return !connection.tags.includes(tag.role("editor"));
  }

  /** HTTP API used by the owner (via the API worker) to manage sharing. */
  override async onRequest(request: Request): Promise<Response> {
    const accountId = request.headers.get(ACCOUNT_HEADER);
    const acl = this.acl;
    if (!accountId) return new Response("unauthorized", { status: 401 });

    if (request.method === "GET") {
      const role = roleFor(acl, accountId);
      if (!acl || !can(role, "viewer")) return new Response("not found", { status: 404 });
      return Response.json({ role, acl: acl.ownerId === accountId ? acl : undefined });
    }

    if (request.method === "PUT") {
      if (acl && acl.ownerId !== accountId) return new Response("forbidden", { status: 403 });
      const update = AclUpdate.safeParse(await request.json().catch(() => null));
      if (!update.success) return Response.json(update.error.issues, { status: 400 });

      const next: DocumentAcl = { ownerId: acl?.ownerId ?? accountId, grants: update.data.grants };
      this.acl = next;
      this.#disconnectRevoked(next);
      return Response.json(next);
    }

    return new Response("method not allowed", { status: 405, headers: { Allow: "GET, PUT" } });
  }

  /** Closes live connections whose role changed so they reconnect with the new one. */
  #disconnectRevoked(acl: DocumentAcl): void {
    for (const connection of this.getConnections()) {
      const account = connection.tags.find((t) => t.startsWith("account:"))?.slice(8);
      const current = connection.tags.find((t) => t.startsWith("role:"))?.slice(5) ?? null;
      if (!account || roleFor(acl, account) !== current) {
        connection.close(FORBIDDEN, "access changed");
      }
    }
  }
}
