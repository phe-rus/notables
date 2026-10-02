import { describe, expect, it } from "bun:test";
import {
  microphoneHelp,
  microphoneProblem,
} from "../../../src/features/recording/lib/microphone-help";

describe("microphone help", () => {
  it("tells declined permission apart from missing or busy microphones", () => {
    expect(microphoneProblem(new DOMException("", "NotAllowedError"))).toBe("denied");
    expect(microphoneProblem(new DOMException("", "NotFoundError"))).toBe("missing");
    expect(microphoneProblem(new DOMException("", "OverconstrainedError"))).toBe("missing");
    expect(microphoneProblem(new DOMException("", "NotReadableError"))).toBe("busy");
  });

  it("points the apps at the right system settings", () => {
    const mac = microphoneHelp("denied", { os: "macos", app: true, browser: "safari" });
    expect(mac.steps).toContain("Privacy & Security → Microphone");
    expect(mac.canOpenSettings).toBe(true);
    const windows = microphoneHelp("denied", { os: "windows", app: true, browser: "edge" });
    expect(windows.steps).toContain("desktop apps");
    expect(
      microphoneHelp("denied", { os: "android", app: true, browser: "chrome" }).steps,
    ).toContain("Apps → Notables");
    expect(microphoneHelp("denied", { os: "ios", app: true, browser: "safari" }).steps).toContain(
      "Settings → Notables",
    );
  });

  it("gives browser steps, with the system's too where it has one", () => {
    const safari = microphoneHelp("denied", { os: "macos", app: false, browser: "safari" });
    expect(safari.steps).toContain("Settings for This Website");
    expect(safari.steps).toContain("System Settings");
    expect(safari.canOpenSettings).toBe(false);
    expect(microphoneHelp("denied", { os: "ios", app: false, browser: "safari" }).steps).toContain(
      "aA",
    );
  });
});
