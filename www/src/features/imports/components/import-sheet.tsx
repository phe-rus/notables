import {
  BookIcon,
  Button,
  CloseIcon,
  cn,
  IconButton,
  SegmentedControl,
  spring,
  toast,
} from "@notables/ui";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type DragEvent, useRef, useState } from "react";
import { buildImportPlan, type ImportFile, type ImportPlan } from "../lib/import-plan";
import { IMPORT_ACCEPT, withPath } from "../lib/picked-files";
import { type ImportOptions, runImport } from "../lib/run-import";

type Stage =
  | { name: "pick" }
  | { name: "review"; plan: ImportPlan; files: Map<string, File> }
  | { name: "importing"; label: string; progress: number };

/** Walks dropped folders, keeping each file's path. */
async function droppedFiles(event: DragEvent): Promise<Array<[ImportFile, File]>> {
  const entries = [...event.dataTransfer.items]
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  if (entries.length === 0) return [...event.dataTransfer.files].map((file) => withPath(file));
  const result: Array<[ImportFile, File]> = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      result.push(withPath(file, `${prefix}${file.name}`));
      return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // Directory readers return entries in batches until an empty one.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) break;
      for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
    }
  };
  for (const entry of entries) await walk(entry, "");
  return result;
}

/**
 * Bring in books from anywhere: e-books, PDFs, comic archives, folders of
 * pages and audiobooks, in bulk. Shows how they'll be arranged into
 * series, books and chapters before importing.
 */
export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Import books"
            className="glass-menu relative flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={spring.smooth}
          >
            <ImportFlow onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ImportFlow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ name: "pick" });
  const [dragging, setDragging] = useState(false);
  const [comicKind, setComicKind] = useState<ImportOptions["comicKind"]>("manga");
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const review = (picked: Array<[ImportFile, File]>) => {
    if (picked.length === 0) return;
    const plan = buildImportPlan(picked.map(([meta]) => meta));
    setStage({
      name: "review",
      plan,
      files: new Map(picked.map(([meta, file]) => [meta.path, file])),
    });
  };

  const rename = (seriesKey: string, title: string) => {
    if (stage.name !== "review") return;
    setStage({
      ...stage,
      plan: {
        ...stage.plan,
        series: stage.plan.series.map((series) =>
          series.key === seriesKey ? { ...series, title } : series,
        ),
      },
    });
  };

  const start = async () => {
    if (stage.name !== "review") return;
    const { plan, files } = stage;
    setStage({ name: "importing", label: "Getting started…", progress: 0 });
    try {
      const result = await runImport(plan, {
        comicKind,
        files,
        onProgress: (label, done, total) =>
          setStage({ name: "importing", label, progress: total ? done / total : 0 }),
      });
      toast.success(
        result.bookIds.length === 1 ? "Book imported" : `${result.bookIds.length} books imported`,
        { description: `${result.chapters} chapters, ready to read` },
      );
      onClose();
      const first = result.bookIds[0];
      if (first) void navigate({ to: "/books/$bookId", params: { bookId: first } });
    } catch (error) {
      console.error(error);
      toast.error("Import stopped", {
        description: error instanceof Error ? error.message : "Something went wrong.",
      });
      setStage({ name: "pick" });
    }
  };

  const hasComics =
    stage.name === "review" && stage.plan.series.some((series) => series.format === "comic");

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-[19px] font-bold tracking-tight">Import</h2>
        {stage.name !== "importing" && (
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon size={18} />
          </IconButton>
        )}
      </header>

      {stage.name === "pick" && (
        <div className="flex flex-col gap-4 px-5 pb-6">
          <section
            aria-label="Drop files or folders here"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={async (event) => {
              event.preventDefault();
              setDragging(false);
              review(await droppedFiles(event));
            }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-accent bg-accent-soft/60" : "border-separator bg-fill/40",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              <BookIcon size={26} />
            </span>
            <p className="text-[16px] font-semibold">Drop books, comics or audiobooks</p>
            <p className="max-w-[380px] text-[14px] leading-snug text-label-secondary">
              EPUB, PDF, CBZ, folders of pages or audio files. Drop a whole series at once: folders
              like “Volume 2” or names like “Book 3” and “S01E04” are put in order for you.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => filesInput.current?.click()}>
                Choose files
              </Button>
              <Button variant="secondary" onClick={() => folderInput.current?.click()}>
                Choose a folder
              </Button>
            </div>
          </section>
          <input
            ref={filesInput}
            type="file"
            multiple
            accept={IMPORT_ACCEPT}
            className="hidden"
            onChange={(event) =>
              review([...(event.target.files ?? [])].map((file) => withPath(file)))
            }
          />
          <input
            ref={folderInput}
            type="file"
            multiple
            className="hidden"
            // Lets people choose a whole folder; paths come back on each file.
            {...{ webkitdirectory: "", directory: "" }}
            onChange={(event) =>
              review([...(event.target.files ?? [])].map((file) => withPath(file)))
            }
          />
        </div>
      )}

      {stage.name === "review" && (
        <>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-4">
            {hasComics && (
              <div className="flex items-center justify-between gap-3 rounded-[16px] bg-fill/60 px-4 py-3">
                <span className="text-[14px]">File page images as</span>
                <SegmentedControl<ImportOptions["comicKind"]>
                  label="File page images as"
                  value={comicKind}
                  onChange={setComicKind}
                  options={[
                    { value: "manga", label: "Manga" },
                    { value: "comic", label: "Comics" },
                  ]}
                />
              </div>
            )}
            {stage.plan.series.map((series) => (
              <section
                key={series.key}
                className="flex flex-col gap-2 rounded-[18px] border border-separator/70 bg-elevated p-4"
              >
                <input
                  value={series.title}
                  onChange={(event) => rename(series.key, event.target.value)}
                  aria-label="Series title"
                  className="control-field rounded-[10px] px-3 py-2 text-[16px] font-semibold"
                />
                <span className="text-[12px] text-label-tertiary">
                  {series.format === "audio"
                    ? "Audiobook"
                    : series.format === "comic"
                      ? "Pages"
                      : "Book"}
                  {series.books.length > 1 &&
                    ` · ${series.books.length} ${series.partLabel.toLowerCase()}s`}
                </span>
                <ol className="flex flex-col divide-y divide-separator/60">
                  {series.books.map((book) => (
                    <li
                      key={book.key}
                      className="flex items-baseline justify-between gap-3 py-2 text-[14px]"
                    >
                      <span className="min-w-0 truncate">
                        {book.volume !== null && (
                          <span className="mr-1.5 font-semibold text-accent-text">
                            {series.partLabel} {book.volume}
                          </span>
                        )}
                        {book.title || (book.volume === null ? series.title : "")}
                      </span>
                      <span className="shrink-0 text-[13px] text-label-tertiary">
                        {book.container
                          ? book.container.name.split(".").pop()?.toUpperCase()
                          : `${book.chapters.length} ${book.chapters.length === 1 ? "chapter" : "chapters"}`}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            {stage.plan.series.length === 0 && (
              <p className="py-8 text-center text-[15px] text-label-secondary">
                Nothing here can be imported yet.
              </p>
            )}
            {stage.plan.skipped.length > 0 && (
              <p className="text-[13px] text-label-tertiary">
                Skipping {stage.plan.skipped.length} other{" "}
                {stage.plan.skipped.length === 1 ? "file" : "files"}.
              </p>
            )}
          </div>
          <footer className="flex justify-end gap-2 border-t border-separator/60 px-5 py-4">
            <Button variant="secondary" onClick={() => setStage({ name: "pick" })}>
              Back
            </Button>
            <Button variant="primary" disabled={stage.plan.series.length === 0} onClick={start}>
              Import
            </Button>
          </footer>
        </>
      )}

      {stage.name === "importing" && (
        <div className="flex flex-col gap-3 px-5 pt-2 pb-8">
          <p className="truncate text-[14px] text-label-secondary">{stage.label}</p>
          <div className="h-2 overflow-hidden rounded-full bg-fill">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${Math.max(4, stage.progress * 100)}%` }}
              transition={spring.smooth}
            />
          </div>
          <p className="text-[13px] text-label-tertiary">Keep Notables open until it finishes.</p>
        </div>
      )}
    </>
  );
}
