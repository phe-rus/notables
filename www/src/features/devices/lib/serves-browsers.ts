import { devicePlatform } from "@/platform/device-platform";

/** Only phones serve browsers (spec 0005, AC-23); computers use the desktop app. */
export function servesBrowsers(): boolean {
  const { app, os } = devicePlatform();
  return app && (os === "android" || os === "ios" || os === "chromeos");
}
