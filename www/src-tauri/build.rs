fn main() {
    // Android links Microsoft's ONNX Runtime (scripts/android/onnxruntime.ts),
    // one library per ABI; ort-sys only names the library, so point the
    // linker at this target's copy.
    println!("cargo:rerun-if-env-changed=NOTABLES_ORT_ANDROID");
    if let Ok(dir) = std::env::var("NOTABLES_ORT_ANDROID")
        && std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("android")
    {
        let abi = match std::env::var("CARGO_CFG_TARGET_ARCH").as_deref() {
            Ok("aarch64") => Some("arm64-v8a"),
            Ok("x86_64") => Some("x86_64"),
            _ => None,
        };
        if let Some(abi) = abi {
            println!("cargo:rustc-link-search=native={dir}/{abi}");
        }
    }
    tauri_build::build()
}
