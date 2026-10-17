// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

const COMMANDS: &[&str] = &["is_available", "write", "scan", "cancel"];

fn main() {
    #[cfg(target_os = "macos")]
    tauri_plugin::mobile::update_entitlements(|entitlements| {
        entitlements.insert(
            "com.apple.developer.nfc.readersession.formats".into(),
            vec!["TAG".into()].into(),
        );
    })
    .expect("failed to configure NFC entitlement");

    let result = tauri_plugin::Builder::new(COMMANDS)
        .global_api_script_path("./api-iife.js")
        .android_path("android")
        .ios_path("ios")
        .try_build();

    // when building documentation for Android the plugin build result is always Err() (docs.rs mounts the sources read-only) and is irrelevant to the crate documentation build
    // `cfg(docsrs)` only reaches rustdoc, build scripts must check the `DOCS_RS` env var instead
    if !(std::env::var_os("DOCS_RS").is_some()
        && std::env::var("TARGET").unwrap().contains("android"))
    {
        result.unwrap();
    }

}
