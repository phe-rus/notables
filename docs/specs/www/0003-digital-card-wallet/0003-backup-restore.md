# Backup and restore

## Deferred design

The password based export and recovery design has been withdrawn. Do not build
password prompts, password envelopes or a password fallback. Recovery needs a
native protected design within Passcode, Face ID and Fingerprint before this
milestone can start. Cross device recovery and loss of device keys remain open
questions, not permission to invent an unattended recovery key.

## Requirements retained for the next design

Backup content must be authenticated and encrypted. Never export device keys or
native protection credentials. Include cards, referenced template versions and
explicitly retained originals, within the existing wallet quotas. Sources and
destinations come from native user selection, never arbitrary JavaScript paths.
Android document providers need a content URI adapter.

Restore validates the entire bounded payload before preview. Show new cards and
matching IDs, default conflicts to keep local, and require an explicit choice for
each replacement. Commit under one transaction with an unchanged vault revision.
Retries must not duplicate cards. Preserve current device protection settings.
Cancellation, corruption, unsupported versions and write failures change nothing.

Recovery must preserve the existing ciphertext and other app data until a staged
replacement has been authenticated, committed and reopened successfully. Never
clear application storage or overwrite a corrupt or unsupported vault. Target
evidence is required before any backup or recovery method ships.
