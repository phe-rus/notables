import { isTauri } from "./runtime";

/** What the app may use on this device, asked for only when it helps. */
export type PermissionKind = "microphone" | "camera" | "notifications";
export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

const mediaFor: Record<"microphone" | "camera", MediaStreamConstraints> = {
  microphone: { audio: true },
  camera: { video: true },
};

/** The current state without asking, where the system can tell. */
export async function permissionState(kind: PermissionKind): Promise<PermissionState> {
  if (kind === "notifications") {
    if (isTauri()) {
      const { isPermissionGranted } = await import("@tauri-apps/plugin-notification");
      return (await isPermissionGranted()) ? "granted" : "prompt";
    }
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission === "default" ? "prompt" : Notification.permission;
  }
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: kind as PermissionName });
    return status.state;
  } catch {
    // Safari and some webviews can't report it; asking will tell.
    return "prompt";
  }
}

/** Asks the system, which shows its own prompt, and reports the answer. */
export async function requestPermission(kind: PermissionKind): Promise<PermissionState> {
  if (kind === "notifications") {
    if (isTauri()) {
      const { requestPermission: ask } = await import("@tauri-apps/plugin-notification");
      const answer = await ask();
      return answer === "granted" ? "granted" : answer === "denied" ? "denied" : "prompt";
    }
    if (typeof Notification === "undefined") return "unsupported";
    const answer = await Notification.requestPermission();
    return answer === "default" ? "prompt" : answer;
  }
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia(mediaFor[kind]);
    // Only asking: let go of the device straight away.
    for (const track of stream.getTracks()) track.stop();
    return "granted";
  } catch (error) {
    const name = (error as DOMException).name;
    // No such device here is not a refusal.
    if (name === "NotFoundError" || name === "OverconstrainedError") return "unsupported";
    return "denied";
  }
}
