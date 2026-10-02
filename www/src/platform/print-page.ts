import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./runtime";

/**
 * Opens the system print dialog. The native apps ask the Rust core, since
 * some system web views ignore window.print(); browsers print directly.
 */
export async function printPage(): Promise<void> {
  if (isTauri()) {
    await invoke("export_print");
    return;
  }
  window.print();
}
