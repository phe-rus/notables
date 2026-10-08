import { useNavigate } from "@tanstack/react-router";
import {
  BookIcon,
  Button,
  CheckIcon,
  CloseIcon,
  cn,
  IconButton,
  SegmentedControl,
  Sheet,
  spring,
  toast,
} from "@ultrapeach/ui";
import { motion } from "motion/react";
import { type DragEvent, type ReactNode, useRef, useState } from "react";
import { locale, t } from "../../../i18n/i18n";
import { kindLabel, partCountLabel } from "../../books/model/kind-labels";
import {
  buildImportPlan,
  choosesDrawnKind,
  type ImportFile,
  type ImportPlan,
  type PlannedSeries,
  withContentHints,
  withSeriesKind,
  withSeriesTitle,
} from "../lib/import-plan";
import type { LibrarySnapshot } from "../lib/import-targets";
import { librarySnapshot } from "../lib/library-snapshot";
import { IMPORT_ACCEPT, withPath } from "../lib/picked-files";
import { readContentHints } from "../lib/read-hints";
import { runImport } from "../lib/run-import";

type Stage =
  | { name: "pick" }
  | { name: "reading"; progress: number }
  | { name: "review"; plan: ImportPlan; files: Map<string, File>; library: LibrarySnapshot }
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
 * series, books and chapters, what kind each series is, and what joins
 * the series already on the shelf, before importing.
 */
export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label={t("imports.sheetLabel")} className="max-w-[620px]">
      <ImportFlow onClose={onClose} />
    </Sheet>
  );
}

const numberList = (numbers: number[]) =>
  new Intl.ListFormat(locale(), { type: "conjunction" }).format(numbers.map(String));

const partWords = { Book: "book", Volume: "volume", Season: "season" } as const;

/** "Volumes 4, 6 and 9", in the series' own word for a part. */
function numberedLabel(numbers: number[], partLabel: string): string {
  const known = partWords[partLabel as keyof typeof partWords];
  const list = numberList(numbers);
  return known
    ? t(`imports.numbered.${known}`, { count: numbers.length, numbers: list })
    : `${partLabel} ${list}`;
}

/** What a merge adds: "Volumes 4, 6 and 9", plus any unnumbered items. */
function addedLabel(series: PlannedSeries): string {
  const parts = [
    series.addedVolumes.length > 0 ? numberedLabel(series.addedVolumes, series.partLabel) : null,
    series.addedUnnumbered > 0 ? t("imports.unnumbered", { count: series.addedUnnumbered }) : null,
  ].filter((part): part is string => part !== null);
  return new Intl.ListFormat(locale(), { type: "conjunction" }).format(parts);
}

function ImportFlow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ name: "pick" });
  const [dragging, setDragging] = useState(false);
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const review = async (picked: Array<[ImportFile, File]>) => {
    if (picked.length === 0) return;
    const library = librarySnapshot();
    const files = new Map(picked.map(([meta, file]) => [meta.path, file]));
    const plan = buildImportPlan(
      picked.map(([meta]) => meta),
      library,
    );
    // What archives and e-books say about themselves settles the preview.
    setStage({ name: "reading", progress: 0 });
    const hints = await readContentHints(plan, files, (done, total) =>
      setStage({ name: "reading", progress: total ? done / total : 1 }),
    );
    setStage({ name: "review", plan: withContentHints(plan, hints, library), files, library });
  };

  const change = (update: (plan: ImportPlan, library: LibrarySnapshot) => ImportPlan) => {
    if (stage.name !== "review") return;
    setStage({ ...stage, plan: update(stage.plan, stage.library) });
  };
  const toggle = (seriesKey: string, field: "merge" | "joinFranchise") =>
    change((plan) => ({
      ...plan,
      series: plan.series.map((entry) =>
        entry.key === seriesKey ? { ...entry, [field]: !entry[field] } : entry,
      ),
    }));

  const start = async () => {
    if (stage.name !== "review") return;
    const { plan, files } = stage;
    setStage({ name: "importing", label: t("imports.gettingStarted"), progress: 0 });
    try {
      const result = await runImport(plan, {
        files,
        onProgress: (label, done, total) =>
          setStage({ name: "importing", label, progress: total ? done / total : 0 }),
      });
      toast.success(t("imports.imported", { count: result.bookIds.length }), {
        description: t("imports.chaptersReady", { count: result.chapters }),
      });
      onClose();
      const first = result.bookIds[0];
      if (first) void navigate({ to: "/books/$bookId", params: { bookId: first } });
    } catch (error) {
      console.error(error);
      toast.error(t("imports.stopped"), {
        description: error instanceof Error ? error.message : t("imports.somethingWrong"),
      });
      setStage({ name: "pick" });
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-[19px] font-bold tracking-tight">{t("imports.title")}</h2>
        {stage.name !== "importing" && (
          <IconButton label={t("common.close")} onClick={onClose}>
            <CloseIcon size={18} />
          </IconButton>
        )}
      </header>

      {stage.name === "pick" && (
        <div className="flex flex-col gap-4 px-5 pb-6">
          <section
            aria-label={t("imports.dropLabel")}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={async (event) => {
              event.preventDefault();
              setDragging(false);
              void review(await droppedFiles(event));
            }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-5xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-accent bg-accent-soft/60" : "border-separator bg-fill/40",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              <BookIcon size={26} />
            </span>
            <p className="text-callout font-semibold">{t("imports.dropTitle")}</p>
            <p className="max-w-[380px] text-[14px] leading-snug text-label-secondary">
              {t("imports.dropBody")}
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => filesInput.current?.click()}>
                {t("imports.chooseFiles")}
              </Button>
              <Button variant="secondary" onClick={() => folderInput.current?.click()}>
                {t("imports.chooseFolder")}
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
              void review([...(event.target.files ?? [])].map((file) => withPath(file)))
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
              void review([...(event.target.files ?? [])].map((file) => withPath(file)))
            }
          />
        </div>
      )}

      {(stage.name === "reading" || stage.name === "importing") && (
        <div className="flex flex-col gap-3 px-5 pt-2 pb-8" aria-live="polite">
          <p className="truncate text-[14px] text-label-secondary">
            {stage.name === "reading" ? t("imports.reading") : stage.label}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-fill">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${Math.max(4, stage.progress * 100)}%` }}
              transition={spring.smooth}
            />
          </div>
          {stage.name === "importing" && (
            <p className="text-footnote text-label-tertiary">{t("imports.keepOpen")}</p>
          )}
        </div>
      )}

      {stage.name === "review" && (
        <>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-4">
            {stage.plan.series.map((series) => (
              <PlannedSeriesCard
                key={series.key}
                series={series}
                onRename={(title) =>
                  change((plan, library) => withSeriesTitle(plan, series.key, title, library))
                }
                onKind={(kind) =>
                  change((plan, library) => withSeriesKind(plan, series.key, kind, library))
                }
                onToggleMerge={() => toggle(series.key, "merge")}
                onToggleFranchise={() => toggle(series.key, "joinFranchise")}
              />
            ))}
            {stage.plan.series.length === 0 && (
              <p className="py-8 text-center text-subheadline text-label-secondary">
                {t("imports.nothing")}
              </p>
            )}
            {stage.plan.skipped.length > 0 && (
              <p className="text-footnote text-label-tertiary">
                {t("imports.skippingOthers", { count: stage.plan.skipped.length })}
              </p>
            )}
          </div>
          <footer className="flex justify-end gap-2 border-t border-separator/60 px-5 py-4">
            <Button variant="secondary" onClick={() => setStage({ name: "pick" })}>
              {t("common.back")}
            </Button>
            <Button variant="primary" disabled={stage.plan.series.length === 0} onClick={start}>
              {t("imports.import")}
            </Button>
          </footer>
        </>
      )}
    </>
  );
}

/** One series as it will be imported: its kind, its volumes, and where it goes. */
function PlannedSeriesCard({
  series,
  onRename,
  onKind,
  onToggleMerge,
  onToggleFranchise,
}: {
  series: PlannedSeries;
  onRename: (title: string) => void;
  onKind: (kind: "comic" | "manga") => void;
  onToggleMerge: () => void;
  onToggleFranchise: () => void;
}) {
  const merging = series.mergeInto !== null && series.merge;
  const skip = new Set(merging ? series.skippedVolumes : []);
  return (
    <section className="flex flex-col gap-2 rounded-4xl border border-separator/70 bg-elevated p-4">
      <input
        value={series.title}
        onChange={(event) => onRename(event.target.value)}
        aria-label={t("imports.seriesTitle")}
        className="control-field rounded-lg px-3 py-2 text-callout font-semibold"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-caption text-label-tertiary">
          {[
            choosesDrawnKind(series) ? null : kindLabel(series.kind),
            series.books.length > 1 ? partCountLabel(series.books.length, series.partLabel) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {choosesDrawnKind(series) && (
          <SegmentedControl<"comic" | "manga">
            label={t("imports.importAs")}
            value={series.kind === "comic" ? "comic" : "manga"}
            onChange={onKind}
            options={[
              { value: "comic", label: kindLabel("comic") },
              { value: "manga", label: kindLabel("manga") },
            ]}
          />
        )}
      </div>
      {series.mergeInto && (
        <Choice checked={series.merge} onToggle={onToggleMerge}>
          {series.addedVolumes.length + series.addedUnnumbered > 0
            ? t("imports.adds", { what: addedLabel(series), title: series.mergeInto.title })
            : t("imports.addsNothing", { title: series.mergeInto.title })}
        </Choice>
      )}
      {merging && series.skippedVolumes.length > 0 && (
        <p className="ps-1 text-footnote text-label-secondary">
          {t("imports.alreadyThere", {
            what: numberedLabel(series.skippedVolumes, series.partLabel),
          })}
        </p>
      )}
      {series.franchise && !merging && (
        <Choice checked={series.joinFranchise} onToggle={onToggleFranchise}>
          {t("imports.joinFranchise", { title: series.franchise.title })}
        </Choice>
      )}
      <ol className="flex flex-col divide-y divide-separator/60">
        {series.books.map((book) => {
          const skipped = book.volume !== null && skip.has(book.volume);
          return (
            <li
              key={book.key}
              className={cn(
                "flex items-baseline justify-between gap-3 py-2 text-[14px]",
                skipped && "text-label-tertiary line-through",
              )}
            >
              <span className="min-w-0 truncate">
                {book.volume !== null && (
                  <span className="me-1.5 font-semibold text-accent-text">
                    {series.partLabel} {book.volume}
                  </span>
                )}
                {book.title || (book.volume === null ? series.title : "")}
              </span>
              <span className="shrink-0 text-footnote text-label-tertiary">
                {[
                  book.parts.length > 0
                    ? t("imports.partCount", { count: book.parts.length })
                    : null,
                  book.container
                    ? book.container.name.split(".").pop()?.toUpperCase()
                    : t("books.chapterCount", { count: book.chapters.length }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Choice({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-fill/50 px-3 py-2.5 text-[14px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[20px] shrink-0 items-center justify-center rounded-sm transition-colors",
          checked
            ? "bg-accent text-on-accent"
            : "shadow-[inset_0_0_0_1.5px_var(--color-label-tertiary)]",
        )}
      >
        {checked && <CheckIcon size={13} strokeWidth={2.6} />}
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}
