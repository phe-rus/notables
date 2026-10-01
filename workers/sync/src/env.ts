import type { NoteDocument } from "./note-document";

export interface Env {
  NoteDocument: DurableObjectNamespace<NoteDocument>;
  AUTH_ISSUER: string;
  AUTH_AUDIENCE: string;
  ALLOW_DEV_TOKENS: string;
}

/** Header carrying the verified account id from the Worker into the Durable Object. */
export const ACCOUNT_HEADER = "x-notables-account";
