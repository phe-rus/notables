import policy from "./policy.json";

/** Public version metadata only, published after store availability is verified. */
export function appReleaseRequest(request: Request): Response {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (request.method !== "GET" && request.method !== "HEAD")
    return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
  return new Response(request.method === "HEAD" ? null : JSON.stringify(policy), { headers });
}
