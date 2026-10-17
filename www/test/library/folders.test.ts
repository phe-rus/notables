import { expect, test } from "bun:test";
import { createMemoryPersistence } from "@notables/sync";
import * as Y from "yjs";
import { folderView } from "../../src/features/library/model/library-views";
import { Library } from "../../src/features/library/store/library-store";

test("default folder migration runs once and deleting folders preserves notes", async () => {
  const persistence = createMemoryPersistence();
  const library = new Library(persistence);
  await library.loaded;
  expect(library.getFolders().map((folder) => folder.name)).toEqual(["Writings", "Notes", "Tasks"]);
  const entry = library.create();
  library.renameFolder("default-writings", "My writing");
  library.removeFolder("default-writings");
  expect(library.get(entry.id)?.folderId).toBe("default-notes");
  library.removeFolder("default-notes");
  library.removeFolder("default-tasks");
  expect(library.get(entry.id)?.folderId).toBeNull();
  const reopened = new Library(persistence);
  await reopened.loaded;
  expect(reopened.getFolders()).toEqual([]);
  expect(reopened.get(entry.id)?.id).toBe(entry.id);
});
test("concurrent folder deletion and note creation leave the note visible", async () => {
  const first = new Library(createMemoryPersistence());
  const second = new Library(createMemoryPersistence());
  await Promise.all([first.loaded, second.loaded]);
  Y.applyUpdate(second.doc, Y.encodeStateAsUpdate(first.doc));
  first.removeFolder("default-notes");
  second.renameFolder("default-notes", "Renamed elsewhere");
  const entry = second.create("note", "default-notes");
  Y.applyUpdate(first.doc, Y.encodeStateAsUpdate(second.doc));
  Y.applyUpdate(second.doc, Y.encodeStateAsUpdate(first.doc));
  expect(first.getFolders().some((folder) => folder.id === "default-notes")).toBe(false);
  expect(second.getFolders().some((folder) => folder.id === "default-notes")).toBe(false);
  const home = first.getFolders()[0];
  if (!home) throw new Error("missing home folder");
  const note = first.get(entry.id);
  if (!note) throw new Error("lost note");
  expect(folderView(home, true, first.getFolders()).matches(note)).toBe(true);
});

test("editing a note preserves folder snapshots and unchanged metadata emits no update", async () => {
  const library = new Library(createMemoryPersistence());
  await library.loaded;
  const entry = library.create();
  const folders = library.getFolders();
  let notifications = 0;
  const unsubscribe = library.subscribe(() => {
    notifications++;
  });
  library.update(entry.id, { title: "Changed", tags: ["travel"] });
  expect(notifications).toBe(1);
  expect(library.getFolders()).toBe(folders);
  library.update(entry.id, { title: "Changed", tags: ["travel"] });
  expect(notifications).toBe(1);
  unsubscribe();
});
