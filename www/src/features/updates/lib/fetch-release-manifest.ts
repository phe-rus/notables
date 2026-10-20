import { deployedSite } from "@/platform/public-url";

export async function fetchReleaseManifest(): Promise<unknown> {
  const response = await fetch(new URL("/api/app-release", deployedSite()), {
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("update-check-failed");
  return response.json();
}
