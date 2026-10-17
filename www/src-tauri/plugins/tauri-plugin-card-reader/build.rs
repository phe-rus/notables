fn main() {
    tauri_plugin::Builder::new(&["recognize", "cancel"])
        .android_path("android")
        .ios_path("ios")
        .build();
}
