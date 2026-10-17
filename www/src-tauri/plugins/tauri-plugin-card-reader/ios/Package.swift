// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-card-reader",
    platforms: [.iOS(.v15)],
    products: [.library(name: "tauri-plugin-card-reader", type: .static, targets: ["tauri-plugin-card-reader"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [.target(name: "tauri-plugin-card-reader", dependencies: [.byName(name: "Tauri")], path: "Sources")]
)
