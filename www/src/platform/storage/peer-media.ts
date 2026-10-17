import { announceMediaArrived } from "@notables/pluraliti";
import type { PeerMedia } from "@notables/sync";
import { hasMedia, loadMedia, saveMediaAs } from "./media-store";

export const peerMedia: PeerMedia = { has: hasMedia, read: loadMedia, write: saveMediaAs };
export const mediaArrived = announceMediaArrived;
