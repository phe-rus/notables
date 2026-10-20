import type { LocalLink, RelayLink, SpacePeer } from "@notables/sync";

export type SpaceDevice = {
  id: string;
  name: string;
  platform: string;
  online: boolean;
  lastSeen: number;
  /** X25519 public key learned through authenticated pairing or the first hello. */
  key?: string;
};

export type PairedDevice = Omit<SpaceDevice, "online" | "lastSeen">;

export type RoomNotices = {
  message(from: string, body: string): void;
  presence(online: string[]): void;
};

export type NoteIds = () => Promise<string[]>;

export type Connected = {
  peer: SpacePeer;
  link: RelayLink;
  device: SpaceDevice | null;
  direct: LocalLink | null;
  retry: ReturnType<typeof setTimeout> | null;
  relayTimer: ReturnType<typeof setTimeout> | null;
};
