import { publicUrl } from "../../../platform/public-url";

/**
 * The link inside a seal's QR code. The seal rides in the fragment, which
 * browsers never send to a server: verification happens on the reader's
 * device, and works with any phone camera.
 */
export function verifyUrl(seal: string): string {
  return `${publicUrl("/verify")}#${seal}`;
}
