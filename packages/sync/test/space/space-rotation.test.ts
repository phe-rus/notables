import { describe, expect, it } from "bun:test";
import { newSecret, spaceIdOf } from "../../src/space/space-keys";
import {
  acceptRotation,
  devicePublicKey,
  readRotationNotice,
  rotateSpace,
} from "../../src/space/space-rotation";

describe("space rotation", () => {
  const oldRoot = newSecret();
  const space = spaceIdOf(oldRoot);
  const phone = { id: "phone", secret: newSecret() };
  const laptop = { id: "laptop", secret: newSecret() };
  const lost = { id: "lost", secret: newSecret() };
  const keyOf = (device: { secret: Uint8Array }) => devicePublicKey(device.secret);
  const stay = [laptop, lost].map((device) => ({ id: device.id, key: keyOf(device) }));

  it("gives the remaining devices the new secret and the removed one nothing", () => {
    const { root, notice } = rotateSpace(oldRoot, phone, stay, ["lost"]);
    expect(notice.to).toBe(spaceIdOf(root));
    expect(Object.keys(notice.envelopes)).toEqual(["laptop"]);
    expect(acceptRotation(notice, laptop, space, keyOf(phone))).toEqual(root);
    expect(acceptRotation(notice, lost, space, keyOf(phone))).toBeNull();
  });

  it("refuses an envelope that its claimed sender didn't seal", () => {
    // The removed device knows the old secret and every public key, but not the phone's private key.
    const forged = rotateSpace(oldRoot, { id: "phone", secret: lost.secret }, stay, ["x"]);
    expect(acceptRotation(forged.notice, laptop, space, keyOf(phone))).toBeNull();
  });

  it("refuses notices for another space, or from a sender this device never met", () => {
    const { notice } = rotateSpace(oldRoot, phone, stay, ["lost"]);
    expect(acceptRotation(notice, laptop, spaceIdOf(newSecret()), keyOf(phone))).toBeNull();
    expect(acceptRotation(notice, laptop, space, undefined)).toBeNull();
  });

  it("refuses a notice whose promised space doesn't match its secret", () => {
    const { notice } = rotateSpace(oldRoot, phone, stay, ["lost"]);
    expect(
      acceptRotation({ ...notice, to: spaceIdOf(newSecret()) }, laptop, space, keyOf(phone)),
    ).toBeNull();
  });

  it("reads notices from the room and rejects malformed ones", () => {
    const { notice } = rotateSpace(oldRoot, phone, stay, ["lost"]);
    expect(readRotationNotice(JSON.stringify(notice))).toEqual(notice);
    expect(readRotationNotice("{}")).toBeNull();
    expect(readRotationNotice("not json")).toBeNull();
    expect(readRotationNotice(JSON.stringify({ ...notice, removed: [1] }))).toBeNull();
  });
});
