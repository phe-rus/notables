import { createMiddleware } from "@tanstack/react-start";

/** Origins the Tauri WebView uses on each platform. */
const NATIVE_APP_ORIGINS = new Set([
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
]);

const SERVER_FUNCTION_PATH = "/_serverFn";

/**
 * Lets the native apps call server functions on the deployed Worker.
 * Only server function requests from Tauri origins get CORS headers.
 */
export const nativeAppCors = createMiddleware().server(async ({ next, request }) => {
  const origin = request.headers.get("Origin");
  const isServerFunction = new URL(request.url).pathname.startsWith(SERVER_FUNCTION_PATH);
  if (!origin || !NATIVE_APP_ORIGINS.has(origin) || !isServerFunction) return next();

  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("Access-Control-Request-Headers") ?? "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const result = await next();
  for (const [name, value] of Object.entries(headers)) result.response.headers.set(name, value);
  return result;
});
