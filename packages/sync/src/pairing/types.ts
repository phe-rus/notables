/*
 * Pairing a browser with a phone, in the room the code points to:
 *
 *   phone   → hello                       (to the browser, or to everyone for a typed code)
 *   browser → start   { sid, share, kind } (its half, and whether it is a browser or a device)
 *   phone   → share   { share, tag }      (its half, and proof it used the same code)
 *   browser → confirm { tag } | wrong     (its proof; both now show four words)
 *   phone   → approved { sealed name } | rejected   (after the person checks the words)
 *
 * The code never crosses the wire; a wrong one fails the tags, and the
 * browser allows a few of those before it gives up on the code.
 */

export type Message =
  | { t: "hello" }
  | { t: "start"; sid: string; share: string; kind?: WaitingKind; receipt?: boolean }
  | { t: "share"; share: string; tag: string }
  | { t: "confirm"; tag: string }
  | { t: "wrong" }
  | { t: "approved"; info: string }
  | { t: "complete"; info: string }
  | { t: "rejected" };

export type Send = (to: string, body: string) => void;

/** What is waiting to be linked: a browser (a window onto a phone) or a device of the space. */
export type WaitingKind = "browser" | "device";

/** What the browser keeps once a phone approves it. */
export type PairedPhone = {
  phoneId: string;
  phoneName: string;
  sessionKey: Uint8Array;
  /** Whatever else the approving device sent, sealed: a space's secret when linking a device. */
  extra: Record<string, unknown>;
};

export type BrowserEvents = {
  /** A phone used the right code: show these words until it decides. */
  words: (words: string[]) => void;
  /** A phone tried a wrong code. */
  wrong: (attemptsLeft: number) => void;
  approved: (phone: PairedPhone) => void;
  rejected: () => void;
  /** Too many wrong codes: make a new one. */
  exhausted: () => void;
};

export type PairingApproval = {
  browserId: string;
  sessionKey: Uint8Array;
  extra: Record<string, unknown>;
};

export type PhoneEvents = {
  words: (words: string[]) => void;
  /** The code did not match this browser. */
  wrong: () => void;
  approved: (browser: PairingApproval) => void;
  failed: () => void;
};
