import type { Persistence, SessionClient } from "@notables/sync";

/**
 * Storage for a browser session: every document is read from the phone and
 * every change is saved there. Nothing is written in the browser.
 */
export function createSessionPersistence(client: SessionClient): Persistence {
  return {
    async bind(name, doc) {
      await client.open(name, doc);
      return { destroy: () => client.close(name) };
    },
    async remove(name) {
      client.remove(name);
    },
  };
}
