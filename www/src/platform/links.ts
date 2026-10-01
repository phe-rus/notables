/**
 * Public URL for a path. Inside Tauri the page origin is the app bundle, so
 * shareable links use the deployed site (VITE_PUBLIC_URL) instead.
 */
export function publicUrl(path: string): string {
  const configured = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  const origin = configured ?? (typeof window !== "undefined" ? window.location.origin : "");
  return new URL(path, origin).href;
}
