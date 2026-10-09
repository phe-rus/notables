import Foundation
import UIKit
import WidgetKit

/// Add to the app target. The Rust core writes the snapshot into the app's
/// own data folder; widgets can only read the shared App Group, so this
/// copies it across and asks iOS to redraw whenever the app is put away.
final class WidgetSnapshotSync {
    static let shared = WidgetSnapshotSync()
    private var observer: NSObjectProtocol?

    /// Call once at launch, e.g. from the app delegate.
    func start() {
        observer = NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.sync() }
    }

    func sync() {
        guard let target = NotablesWidgets.sharedSnapshotURL,
              let source = Self.appSnapshotURL()
        else { return }
        do {
            let data = try Data(contentsOf: source)
            try data.write(to: target, options: .atomic)
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            // Nothing to copy yet; widgets keep their last content.
        }
    }

    /// Where Tauri's app data folder is on iOS (with or without the identifier subfolder).
    private static func appSnapshotURL() -> URL? {
        guard let support = FileManager.default.urls(
            for: .applicationSupportDirectory, in: .userDomainMask
        ).first else { return nil }
        let identifier = Bundle.main.bundleIdentifier ?? "notables.pherus.org"
        return [
            support.appendingPathComponent("\(identifier)/widgets/today.json"),
            support.appendingPathComponent("widgets/today.json"),
        ].first { FileManager.default.fileExists(atPath: $0.path) }
    }
}
