import type { DevicePlatform } from "../../../platform/device-platform";

/** Why the microphone couldn't be used. */
export type MicrophoneProblem = "denied" | "missing" | "busy";

export function microphoneProblem(error: unknown): MicrophoneProblem {
  const name = (error as { name?: string } | null)?.name ?? "";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "denied";
}

export interface MicrophoneHelp {
  title: string;
  /** What to do, in the words this system uses. */
  steps: string;
  /** The app can open the right settings page directly. */
  canOpenSettings: boolean;
}

/** Directions that match the system and browser in front of the person. */
export function microphoneHelp(problem: MicrophoneProblem, device: DevicePlatform): MicrophoneHelp {
  if (problem === "missing") {
    return {
      title: "No microphone found",
      steps: "Connect a microphone or headset, then try again.",
      canOpenSettings: false,
    };
  }
  if (problem === "busy") {
    return {
      title: "The microphone is busy",
      steps: "Another app may be using it. Close calls or recorders, then try again.",
      canOpenSettings: false,
    };
  }

  const title = "Notables can’t use the microphone";
  if (device.app) {
    switch (device.os) {
      case "macos":
        return {
          title,
          steps: "Turn on Notables in System Settings → Privacy & Security → Microphone.",
          canOpenSettings: true,
        };
      case "windows":
        return {
          title,
          steps:
            "Turn on microphone access, and “Let desktop apps access your microphone”, in Settings → Privacy & security → Microphone.",
          canOpenSettings: true,
        };
      case "ios":
        return {
          title,
          steps: "Open Settings → Notables and turn on Microphone.",
          canOpenSettings: false,
        };
      case "android":
        return {
          title,
          steps: "Open Settings → Apps → Notables → Permissions and allow Microphone.",
          canOpenSettings: false,
        };
      default:
        return {
          title,
          steps:
            "Check that your system allows apps to use the microphone (sound or privacy settings).",
          canOpenSettings: false,
        };
    }
  }

  // In a browser: the site permission first, then the system's if it has one.
  const site = (() => {
    if (device.os === "ios") {
      return device.browser === "safari"
        ? "Tap aA in the address bar → Website Settings → Microphone → Allow."
        : "Open Settings → your browser → Microphone, then reload.";
    }
    switch (device.browser) {
      case "safari":
        return "Choose Safari → Settings for This Website → Microphone → Allow, then reload.";
      case "firefox":
        return "Click the microphone icon in the address bar and remove the block, then reload.";
      default:
        return "Click the site controls next to the address and allow Microphone, then reload.";
    }
  })();
  const system =
    device.os === "macos"
      ? " Also check System Settings → Privacy & Security → Microphone for your browser."
      : device.os === "windows"
        ? " Also check Settings → Privacy & security → Microphone."
        : device.os === "chromeos"
          ? " Also check Settings → Privacy and security → Microphone."
          : device.os === "android"
            ? " Also check that your browser may use the microphone in Settings → Apps."
            : "";
  return { title, steps: site + system, canOpenSettings: false };
}
