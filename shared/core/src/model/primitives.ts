import { z } from "zod";

export const Id = z.uuid();

/**
 * Account identifiers are issued by the identity provider (the OIDC `sub`
 * claim), so they are opaque strings rather than Notables ids.
 */
export const AccountId = z.string().min(1).max(255);

/** Milliseconds since the Unix epoch. */
export const Timestamp = z.number().int().nonnegative();
