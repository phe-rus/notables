import { rememberPairedDevice } from "@/platform/space/space-membership";

/** Metadata travels inside the authenticated pairing, never in the public QR code. */
export function rememberPairing(id: string, fallbackName: string, value: unknown) {
  const device = value && typeof value === "object" ? value : {};
  const name = "name" in device && typeof device.name === "string" ? device.name : fallbackName;
  const platform =
    "platform" in device && typeof device.platform === "string" ? device.platform : "other";
  const key =
    "key" in device && typeof device.key === "string" && /^[a-f0-9]{64}$/.test(device.key)
      ? device.key
      : undefined;
  rememberPairedDevice({ id, name: name.slice(0, 200), platform: platform.slice(0, 40), key });
}
