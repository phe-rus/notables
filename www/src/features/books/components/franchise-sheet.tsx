import { CloseIcon, IconButton, Sheet } from "@notables/ui";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { setSeriesFranchise, startFranchise } from "../actions/franchise";
import {
  FRANCHISE_TITLE_MAX,
  type FranchiseEntry,
  getFranchiseStore,
  useFranchises,
} from "../store/franchise-store";
import { type SeriesEntry, useSeries } from "../store/series-store";

export type FranchiseTask =
  | { type: "add"; series: SeriesEntry }
  | { type: "rename"; franchise: FranchiseEntry };

/** Adds a series to a franchise, new or existing, or renames a franchise. */
export function FranchiseSheet({
  task,
  onClose,
}: {
  task: FranchiseTask | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={task !== null}
      onClose={onClose}
      label={task?.type === "rename" ? t("books.franchise.renameTitle") : t("books.franchise.add")}
      className="max-w-[440px]"
    >
      {task && (
        <FranchiseContent
          key={task.type === "add" ? task.series.id : task.franchise.id}
          task={task}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function FranchiseContent({ task, onClose }: { task: FranchiseTask; onClose: () => void }) {
  const franchises = useFranchises();
  const allSeries = useSeries();
  const [name, setName] = useState(task.type === "add" ? task.series.title : task.franchise.title);
  const titleCounts = new Map<string, number>();
  for (const entry of franchises) {
    titleCounts.set(entry.title, (titleCounts.get(entry.title) ?? 0) + 1);
  }
  const seriesIn = (id: string) => allSeries.filter((entry) => entry.franchiseId === id).length;
  const others =
    task.type === "add" ? franchises.filter((entry) => entry.id !== task.series.franchiseId) : [];

  const submit = () => {
    const title = name.trim();
    if (!title) return;
    if (task.type === "add") startFranchise(task.series.id, title);
    else getFranchiseStore().rename(task.franchise.id, title);
    onClose();
  };
  const join = (franchise: FranchiseEntry) => {
    if (task.type === "add") setSeriesFranchise(task.series.id, franchise.id);
    onClose();
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-[20px] font-bold tracking-tight">
            {task.type === "add"
              ? t("books.franchise.addTitle", { title: task.series.title })
              : t("books.franchise.renameTitle")}
          </h2>
          {task.type === "add" && (
            <p className="text-[13px] leading-snug text-label-secondary">
              {t("books.franchise.hint")}
            </p>
          )}
        </div>
        <IconButton label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      <div className="flex grow flex-col gap-5 overflow-y-auto px-6 pt-3 pb-6">
        {others.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[12px] font-medium text-label-tertiary">
              {t("books.franchise.existing")}
            </h3>
            <ul className="flex flex-col">
              {others.map((franchise) => (
                <li key={franchise.id}>
                  <button
                    type="button"
                    onClick={() => join(franchise)}
                    className="flex w-full items-baseline justify-between gap-3 rounded-[12px] px-3 py-2.5 text-start transition-colors hover:bg-fill/70"
                  >
                    <span className="truncate text-[15px] font-semibold">{franchise.title}</span>
                    {/* Two franchises may share a name: their sizes tell them apart. */}
                    {(titleCounts.get(franchise.title) ?? 0) > 1 && (
                      <span className="shrink-0 text-[13px] text-label-secondary">
                        {t("trash.seriesCount", { count: seriesIn(franchise.id) })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="franchise-name" className="text-[12px] font-medium text-label-tertiary">
            {task.type === "add" ? t("books.franchise.newLabel") : t("books.franchise.name")}
          </label>
          <div className="flex gap-2">
            <input
              id="franchise-name"
              value={name}
              maxLength={FRANCHISE_TITLE_MAX}
              onChange={(event) => setName(event.target.value)}
              className="control-field min-w-0 grow rounded-[10px] px-3 py-2 text-[16px]"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="shrink-0 rounded-full bg-accent px-4 text-[14px] font-semibold text-on-accent transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              {task.type === "add" ? t("books.franchise.create") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
