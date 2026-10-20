import type { DeviceHello } from "@notables/sync";
import { devicePlatform } from "@/platform/device-platform";
import { thisDeviceName } from "@/platform/session/this-device";
import { deviceKey } from "@/platform/space/space-identity";

export function pairingDevice(): DeviceHello {
  return { name: thisDeviceName(), platform: devicePlatform().os, key: deviceKey()?.publicKey };
}
