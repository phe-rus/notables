import SwiftUI
import WidgetKit

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: .now, snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(TodayEntry(date: .now, snapshot: WidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let entry = TodayEntry(date: .now, snapshot: WidgetSnapshot.load())
        // The app asks for a redraw when it changes; this keeps "Today" honest overnight.
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    private var agendaLimit: Int { family == .systemSmall ? 2 : 3 }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.snapshot?.labels.upNext ?? "Today")
                .font(.caption.weight(.semibold))
                .textCase(.uppercase)
                .foregroundStyle(.orange)

            if let snapshot = entry.snapshot, !snapshot.agenda.isEmpty {
                ForEach(snapshot.agenda.prefix(agendaLimit), id: \.self) { item in
                    Link(destination: URL(string: item.link) ?? URL(string: "notables://calendar")!) {
                        HStack(spacing: 8) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(hex: item.color))
                                .frame(width: 3)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(item.title).font(.subheadline.weight(.medium)).lineLimit(1)
                                Text(item.when).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                            }
                        }
                    }
                }
            } else {
                Text(entry.snapshot?.labels.nothingPlanned ?? "")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if family != .systemSmall, let note = entry.snapshot?.pinned.first {
                Divider()
                Link(destination: URL(string: note.link) ?? URL(string: "notables://home")!) {
                    Label(note.title, systemImage: "pin")
                        .font(.footnote)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .widgetURL(URL(string: "notables://home"))
        .containerBackground(.background, for: .widget)
    }
}

@main
struct NotablesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "notables.pherus.org.today", provider: TodayProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Notables")
        .description("Today’s plans and pinned notes.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

extension Color {
    /// "#RRGGBB" from the snapshot.
    init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0xE39A2E
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}
