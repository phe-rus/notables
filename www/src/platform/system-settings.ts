import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./runtime";

/** Opens the system's microphone privacy page; false where there isn't one to open. */
export async function openMicrophoneSettings(): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>("open_microphone_settings").catch(() => false);
}
