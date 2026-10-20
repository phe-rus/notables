export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export const updateDestinations = {
  "android-play": "https://play.google.com/store/apps/details?id=notables.pherus.org",
  "ios-testflight": "https://testflight.apple.com/join/6CANqdbj",
  "ios-app-store": "https://apps.apple.com/app/id6820814305",
  desktop: "https://pherus.org/showcase/notables",
} as const;

export type ReleaseChannel = keyof typeof updateDestinations;
export interface AppRelease {
  version: string;
  build: number;
  availableAt: string;
}
export interface ReleaseManifest {
  schema: 1;
  channels: Partial<Record<ReleaseChannel, AppRelease | null>>;
}

export function isReleaseChannel(value: unknown): value is ReleaseChannel {
  return typeof value === "string" && Object.hasOwn(updateDestinations, value);
}

const versionParts = (version: string): number[] | null => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null;
  const parts = version.split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
};

export function compareVersions(left: string, right: string): number | null {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
}

export function parseRelease(value: unknown): AppRelease | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.version !== "string" ||
    !versionParts(entry.version) ||
    typeof entry.build !== "number" ||
    !Number.isSafeInteger(entry.build) ||
    entry.build < 1 ||
    typeof entry.availableAt !== "string" ||
    !Number.isFinite(Date.parse(entry.availableAt))
  )
    return null;
  return { version: entry.version, build: entry.build, availableAt: entry.availableAt };
}

/** Missing or malformed entries are errors; explicit null revokes a release. */
export function releaseFor(value: unknown, channel: ReleaseChannel): AppRelease | null {
  if (!value || typeof value !== "object") throw new Error("invalid-release-manifest");
  const manifest = value as Record<string, unknown>;
  if (manifest.schema !== 1 || !manifest.channels || typeof manifest.channels !== "object")
    throw new Error("invalid-release-manifest");
  const entry = (manifest.channels as Record<string, unknown>)[channel];
  if (entry === null) return null;
  const release = parseRelease(entry);
  if (!release) throw new Error("invalid-release");
  return release;
}

export function newerRelease(release: AppRelease, installed: { version: string; build: number }) {
  const comparison = compareVersions(release.version, installed.version);
  return (
    comparison !== null && (comparison > 0 || (comparison === 0 && release.build > installed.build))
  );
}

/** Every published release gets a full seven days after store availability. */
export function releaseDeadline(release: AppRelease): number {
  return Date.parse(release.availableAt) + GRACE_MS;
}
