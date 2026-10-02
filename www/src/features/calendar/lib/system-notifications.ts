import type { DueAlert } from "@notables/core";
import { devicePlatform } from "../../../platform/device-platform";
import { isTauri } from "../../../platform/runtime";
import { describeAlert } from "./describe-alert";

/** Phones deliver scheduled notifications even when the app is closed. */
export function schedulesNatively(): boolean {
  if (!isTauri()) return false;
  const { os } = devicePlatform();
  return os === "ios" || os === "android";
}

async function allowed(): Promise<boolean> {
  if (isTauri()) {
    const { isPermissionGranted } = await import("@tauri-apps/plugin-notification");
    return isPermissionGranted();
  }
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

/** Shows a system notification now, if the person allowed them. */
export async function notifyNow(alert: DueAlert, onOpen: () => void) {
  if (!(await allowed())) return;
  const { title, body } = describeAlert(alert);
  if (isTauri()) {
    const { sendNotification } = await import("@tauri-apps/plugin-notification");
    sendNotification({ title, body });
    return;
  }
  const notification = new Notification(title, { body, tag: `${alert.event.id}:${alert.day}` });
  notification.onclick = () => {
    window.focus();
    onOpen();
    notification.close();
  };
}

/** Notification IDs must be 32-bit integers; derive a stable one per occurrence. */
function notificationId(alert: DueAlert): number {
  let hash = 0;
  for (const char of `${alert.event.id}:${alert.day}`) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) || 1;
}

const SCHEDULED_KEY = "notables:scheduled-alerts";

/**
 * Hands the coming alerts to the phone so they arrive with the app
 * closed. Replaces whatever this app scheduled before.
 */
export async function scheduleNatively(alerts: DueAlert[]) {
  if (!schedulesNatively() || !(await allowed())) return;
  const { cancel, Schedule, sendNotification } = await import("@tauri-apps/plugin-notification");
  try {
    const previous = JSON.parse(localStorage.getItem(SCHEDULED_KEY) ?? "[]") as number[];
    if (previous.length > 0) await cancel(previous);
  } catch {
    // Nothing to cancel.
  }
  const ids: number[] = [];
  for (const alert of alerts) {
    const { title, body } = describeAlert(alert);
    const id = notificationId(alert);
    ids.push(id);
    sendNotification({ id, title, body, schedule: Schedule.at(alert.at, false, true) });
  }
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(ids));
}
