Based on tauri-plugin-nfc 2.4.1 (MIT/Apache-2.0; original licenses retained).
Android wallet patches: explicit cancellation command; reject and clear sessions
on pause or superseding scans; end foreground dispatch after reading; unsigned
payload bytes; safe handling of empty NDEF messages. Removed automatic manifest
intent filters so only a foreground user initiated scan receives cards. NFC tag
writing is never granted by wallet capabilities. Reevaluate these changes before
upgrading. iOS is enabled for read-only acquisition, with a cancellation command,
an NFC usage description and a build-time TAG entitlement. Its provisioning
profile must include NFC Tag Reading. Physical iPhone/tag verification is owed.
