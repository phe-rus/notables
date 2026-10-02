/**
 * Stands in for `cloudflare:workers` in the native app bundle. Server
 * functions run on the deployed Worker; the app reaches them over HTTP
 * (see platform/server-bridge), so nothing here should ever be read.
 */
export const env: Cloudflare.Env = new Proxy({} as Cloudflare.Env, {
  get(_, binding) {
    throw new Error(`Worker binding "${String(binding)}" is not available inside the app.`);
  },
});
