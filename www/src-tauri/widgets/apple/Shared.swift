import Foundation

/// Shared by the app and the widget extension (add this file to both targets).
enum NotablesWidgets {
    /// The App Group both targets belong to (Signing & Capabilities › App Groups).
    static let appGroup = "group.notables.pherus.org"
    static let fileName = "today.json"

    static var sharedSnapshotURL: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
            .appendingPathComponent(fileName)
    }
}

/// The snapshot the app writes (see www/src/features/widgets/lib/widget-snapshot.ts).
struct WidgetSnapshot: Decodable {
    struct Labels: Decodable {
        let today: String
        let upNext: String
        let nothingPlanned: String
        let pinned: String
        let recent: String
    }

    struct AgendaItem: Decodable, Hashable {
        let title: String
        let when: String
        let color: String
        let day: String
        let link: String
    }

    struct NoteItem: Decodable, Hashable {
        let title: String
        let link: String
    }

    let version: Int
    let updatedAt: Double
    let labels: Labels
    let agenda: [AgendaItem]
    let pinned: [NoteItem]
    let recent: [NoteItem]

    static func load() -> WidgetSnapshot? {
        guard let url = NotablesWidgets.sharedSnapshotURL,
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
}
