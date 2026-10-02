import { useEffect } from "react";
import { syncShareSessions } from "../lib/share-sessions";
import { useShares } from "../store/share-store";

/** Keeps shared notes connected to the other devices while the app is open. */
export function ShareSessionsRunner() {
  const shares = useShares();
  useEffect(() => {
    syncShareSessions();
  }, [shares]);
  return null;
}
