export interface SyncConfig {
  /** Base URL of the API worker, e.g. `https://api.notables.pherus.org`. */
  apiUrl: string;
  /** Host of the sync worker, e.g. `sync.notables.pherus.org` or `localhost:8788`. */
  syncHost: string;
  /**
   * Returns a fresh access token, or null when the user is signed out.
   * Signed-out users stay fully functional locally; nothing is synced.
   */
  getToken: () => Promise<string | null>;
}
