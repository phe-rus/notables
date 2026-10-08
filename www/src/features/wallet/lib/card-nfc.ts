import { invoke } from "@tauri-apps/api/core";
import { isAvailable, scan, type Tag } from "@tauri-apps/plugin-nfc";
import { isTauri } from "../../../platform/runtime";

let pending = false;
export async function walletNfcAvailable() {
  if (!isTauri()) return false;
  try {
    return await isAvailable();
  } catch {
    return false;
  }
}
export function cancelWalletNfc() {
  if (pending) void invoke("plugin:nfc|cancel").catch(() => {});
}

/** Read only bounded NDEF text, never execute URIs or infer fields from a chip UID. */
export function cardNfcText(tag: Tag) {
  if (tag.records.length > 32) throw new Error("invalid-nfc");
  let total = 0;
  return tag.records
    .flatMap((record) => {
      total += record.payload.length;
      if (
        total > 20_000 ||
        !record.payload.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
      )
        throw new Error("invalid-nfc");
      if (
        record.tnf !== 1 ||
        record.kind.length !== 1 ||
        record.kind[0] !== 84 ||
        !record.payload.length
      )
        return [];
      const bytes = new Uint8Array(record.payload);
      const status = record.payload[0] ?? 0;
      const offset = 1 + (status & 63);
      if (offset > bytes.length) throw new Error("invalid-nfc");
      return [
        new TextDecoder(status & 128 ? "utf-16be" : "utf-8", { fatal: true }).decode(
          bytes.subarray(offset),
        ),
      ];
    })
    .join("\n");
}
export async function readWalletNfc() {
  if (pending || !(await walletNfcAvailable())) throw new Error("nfc-unavailable");
  if (pending) throw new Error("nfc-busy");
  pending = true;
  const timer = window.setTimeout(cancelWalletNfc, 30_000);
  try {
    const tag = await scan({ type: "tag" }, { keepSessionAlive: false });
    const text = cardNfcText(tag);
    if (!text.trim()) throw new Error("no-readable-details");
    return text;
  } finally {
    cancelWalletNfc();
    pending = false;
    window.clearTimeout(timer);
  }
}
