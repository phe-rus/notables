import { isTauri } from "./runtime";

const SERVER_FUNCTION_PATH = "/_serverFn";

/**
 * In a packaged Tauri app the page is served from the app bundle, so server
 * function calls (publishing, reactions) are forwarded to the deployed
 * Worker at VITE_PUBLIC_URL. In development the Vite server answers them.
 */
export function installServerBridge(): void {
  const server = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (!isTauri() || !import.meta.env.PROD || !server) return;

  const nativeFetch = window.fetch.bind(window);
  const bridgedFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    const { pathname, search, origin } = new URL(url, window.location.href);
    if (origin === window.location.origin && pathname.startsWith(SERVER_FUNCTION_PATH)) {
      const target = new URL(pathname + search, server).href;
      return nativeFetch(input instanceof Request ? new Request(target, input) : target, init);
    }
    return nativeFetch(input, init);
  };
  // The workspace's fetch type includes Bun-only extras; the WebView's does not.
  window.fetch = bridgedFetch as typeof window.fetch;
}
