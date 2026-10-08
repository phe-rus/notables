Based on tauri-plugin-nfc 2.4.1 (MIT/Apache-2.0; original licenses retained).
Android wallet patches: explicit cancellation command; reject and clear sessions
on pause or superseding scans; end foreground dispatch after reading; unsigned
payload bytes; safe handling of empty NDEF messages. Removed automatic manifest
intent filters so only a foreground user initiated scan receives cards. NFC tag
writing is never granted by wallet capabilities. Reevaluate these changes before
upgrading. iOS is not enabled by the wallet dependency.
