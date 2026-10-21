import { moveAllToBin } from "@/features/trash/lib/recycle-bin";
import { isGeneratedLedger } from "../model/generated-entry";
import { folderView } from "../model/library-views";
import { type Folder, getLibrary } from "../store/library-store";

/**
 * Deletes a folder with everything in it: its notes go to Recently Deleted,
 * where they can be restored for a week (into the first folder, since theirs
 * is gone). The first folder also holds notes without a folder, so deleting
 * it takes those too.
 */
export function deleteFolder(folder: Folder) {
  const library = getLibrary();
  if (
    [...library.entries.values()].some(
      (entry) => entry.folderId === folder.id && isGeneratedLedger(entry),
    )
  )
    return;
  const folders = library.getFolders();
  const fallback =
    folder.id === (folders.find((item) => item.id === "default-writings") ?? folders[0])?.id;
  const { matches } = folderView(folder, fallback, folders);
  const notes = [...library.entries.values()].filter((entry) => !entry.trashedAt && matches(entry));
  library.doc.transact(() => {
    moveAllToBin(notes, []);
    library.removeFolder(folder.id);
  });
}
