import { getFranchiseStore } from "../store/franchise-store";
import { getSeriesStore } from "../store/series-store";

/** Puts a series in a franchise, or takes it out with `null`. */
export function setSeriesFranchise(seriesId: string, franchiseId: string | null): void {
  const series = getSeriesStore();
  if (!series.series.get(seriesId)) return;
  if (franchiseId && !getFranchiseStore().franchises.get(franchiseId)) return;
  series.update(seriesId, { franchiseId });
}

/** Starts a franchise for a series, named after it until renamed. */
export function startFranchise(seriesId: string, title: string): void {
  const franchise = getFranchiseStore().create(title);
  setSeriesFranchise(seriesId, franchise.id);
}

/** A franchise goes once its last series is erased. */
export function dropFranchiseIfEmpty(franchiseId: string | null | undefined): void {
  if (!franchiseId) return;
  const left = [...getSeriesStore().series.values()].some(
    (entry) => entry.franchiseId === franchiseId,
  );
  if (!left) getFranchiseStore().franchises.delete(franchiseId);
}
