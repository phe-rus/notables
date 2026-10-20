import { isTauri } from "@/platform/runtime";
import { appUpdateStore } from "../store/app-update-store";

/** Own the launch, foreground and deadline subscriptions in one mounted boundary. */
export function startAppUpdates() {
  if (!isTauri() || import.meta.env.DEV) return;
  const check = () => {
    if (document.visibilityState === "visible") void appUpdateStore.check();
  };
  check();
  window.addEventListener("online", check);
  document.addEventListener("visibilitychange", check);
  const timer = setInterval(
    () => {
      appUpdateStore.tick();
      check();
    },
    60 * 60 * 1000,
  );
  const deadline = setInterval(appUpdateStore.tick, 60 * 1000);
  return () => {
    window.removeEventListener("online", check);
    document.removeEventListener("visibilitychange", check);
    clearInterval(timer);
    clearInterval(deadline);
  };
}
