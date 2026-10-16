/**
 * Fills the welcomed library with what the store screenshots show: a full
 * day on the calendar, a route sketched by hand in the Jinja plan and a
 * longer invoice. Runs inside the dev app through
 * `page.evaluate`, so it is serialized on its own: everything it needs is
 * imported here, by the URLs the dev server serves the app's modules on.
 */
import type { InkStroke } from "./sketch";

export interface SeedInput {
  sketch: { strokes: InkStroke[]; height: number };
  /** The day the screenshots are taken on, YYYY-MM-DD. */
  day: string;
  /** Where the dev server serves the editor package (see `moduleUrls`). */
  urls: { pluraliti: string };
}

// Loose types: these are the app's own modules, loaded in the page.
// biome-ignore lint/suspicious/noExplicitAny: modules come from the running app
type Module = any;

export async function seedStoreContent({ sketch, day, urls }: SeedInput): Promise<string> {
  const load = (path: string): Promise<Module> => import(/* @vite-ignore */ path);
  const [calendar, library, invoices, writer, deleter, pluraliti] = await Promise.all([
    load("/src/features/calendar/store/calendar-store.ts"),
    load("/src/features/library/store/library-store.ts"),
    load("/src/features/invoices/store/invoice-store.ts"),
    load("/src/features/library/lib/write-note.ts"),
    load("/src/features/notes/actions/delete-note.ts"),
    load(urls.pluraliti),
  ]);

  // A full day, with a birthday and a trip across the top.
  const events = calendar.getCalendarStore();
  for (const event of events.getSnapshot()) events.remove(event.id);
  const add = (kind: string, title: string, extra: Record<string, unknown>) =>
    events.save({
      ...events.draft(kind, (extra.date as string) ?? day, (extra.time as string) ?? null),
      title,
      ...extra,
    });
  add("birthday", "Grace", { date: `1994-${day.slice(5)}`, yearKnown: true });
  add("trip", "Weekend in Jinja", { endDate: shift(day, 2), location: "Jinja" });
  add("plan", "Morning run by the lake", { time: "07:00", duration: 60 });
  add("plan", "Menu review, Harbour Café", {
    time: "09:00",
    duration: 60,
    location: "2 Pier Street",
  });
  add("reminder", "Send the invoice to Harbour Café", { time: "10:30", duration: 30 });
  add("plan", "Lunch with Grace", { time: "12:30", duration: 90, location: "The Deck" });
  add("deadline", "Shop sign drafts due", { time: "15:00", duration: 60 });
  add("reminder", "Book the early bus", { time: "17:00", duration: 30 });
  add("plan", "Pack for Jinja", { time: "19:00", duration: 60 });

  // The Jinja plan, with the route sketched under the checklist.
  const notes = library.getLibrary();
  const plan = notes.getSnapshot().find((entry: Module) => entry.title === "Weekend in Jinja");
  if (plan) {
    const markdown = `# Weekend in Jinja

## Before we go

- [x] Book the early bus
- [x] Charge the camera
- [ ] Pack rain jackets
- [ ] Download offline maps

## The route

## Saturday

- Source of the Nile at sunrise
- Lunch by the water
- Kayaking if the river is calm`;
    // The Markdown is composed on a scratch document first, then the sketch
    // goes in under its heading.
    const withSketch = (doc: Module) => {
      const scratch = new doc.constructor();
      const children = pluraliti.composeDocumentFromMarkdown(scratch, markdown).root.children;
      scratch.destroy();
      const route = children.findIndex(
        (node: Module) => node.type === "heading" && node.children?.[0]?.text === "The route",
      );
      children.splice(route + 1, 0, { type: "ink", version: 1, ...sketch });
      return children;
    };
    await deleter.deleteNote(plan.id);
    await writer.writeNote({
      kind: plan.kind,
      updatedAt: plan.updatedAt,
      compose: (doc: Module) =>
        pluraliti.composeDocument(doc, (editor: Module) => {
          const children = withSketch(doc);
          const root = editor._pendingEditorState._nodeMap.get("root");
          root.clear();
          const build = (json: Module): Module => {
            const node = editor._nodes.get(json.type).klass.importJSON(json);
            for (const child of json.children ?? []) node.append(build(child));
            return node;
          };
          for (const child of children) root.append(build(child));
        }),
    });
  }

  // A fuller invoice.
  const bills = invoices.getInvoiceStore();
  for (const bill of bills.getSnapshot()) {
    bills.update(bill.id, {
      items: [
        { id: "menu", description: "Menu illustrations", quantity: 6, unitPrice: 4500 },
        { id: "sign", description: "Shop sign design", quantity: 1, unitPrice: 18000 },
        { id: "window", description: "Window lettering", quantity: 2, unitPrice: 9500 },
        { id: "cards", description: "Loyalty cards, 500", quantity: 1, unitPrice: 6000 },
      ],
      notes:
        bill.kind === "receipt"
          ? "Thank you! It was a joy to draw for the café."
          : "Thank you for the work. Payment within 14 days, please.",
    });
  }
  return "seeded";

  function shift(date: string, days: number) {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  }
}
