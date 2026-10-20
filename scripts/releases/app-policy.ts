import { rename } from "node:fs/promises";
import { isReleaseChannel } from "../../www/src/features/updates/lib/is-release-channel";
import { parseRelease } from "../../www/src/features/updates/lib/parse-release";
import type { ReleaseChannel, ReleaseManifest } from "../../www/src/features/updates/model/types";

/** Publication is deliberate: a successful upload alone does not make an update installable. */
export function changeReleasePolicy(
  current: ReleaseManifest,
  channel: ReleaseChannel,
  values: string[],
  now = Date.now(),
): ReleaseManifest {
  if (values.length === 1 && values[0] === "--withdraw")
    return { ...current, channels: { ...current.channels, [channel]: null } };
  const [version, build, availableAt, confirmation] = values;
  const release = parseRelease({ version, build: Number(build), availableAt });
  if (
    values.length !== 4 ||
    confirmation !== "--available" ||
    !release ||
    Date.parse(release.availableAt) > now
  )
    throw new Error(
      "Provide VERSION BUILD AVAILABLE_AT --available after verifying store availability.",
    );
  return {
    schema: 1,
    channels: {
      ...current.channels,
      [channel]: { ...release, availableAt: new Date(release.availableAt).toISOString() },
    },
  };
}

if (import.meta.main) {
  const [channel, ...values] = Bun.argv.slice(2);
  if (!isReleaseChannel(channel))
    throw new Error("Choose android-play, ios-testflight, ios-app-store or desktop.");
  const path = new URL("../../www/src/server/releases/policy.json", import.meta.url);
  const current = await Bun.file(path).json();
  const next = changeReleasePolicy(current, channel, values);
  const temporary = new URL("./policy.json.tmp", path);
  await Bun.write(temporary, `${JSON.stringify(next, null, 2)}\n`);
  await rename(temporary, path);
  console.info(`Prepared ${channel}. Review the policy diff, then deploy the web Worker.`);
}
