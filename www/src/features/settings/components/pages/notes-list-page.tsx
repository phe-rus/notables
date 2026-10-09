import { LabeledContent, Section, SegmentedControl, Toggle } from "@ultrapeach/ui";
import { PickerInput } from "../../../../components/form/form-fields";
import { t } from "../../../../i18n/i18n";
import {
  type ListPreferences,
  type PreviewLines,
  previewLineCounts,
  type SwipeAction,
  swipeActions,
} from "../../model/preferences";
import { updatePreferences, usePreferences } from "../../store/preferences-store";

const setList = (change: Partial<ListPreferences>) =>
  updatePreferences((p) => ({ ...p, list: { ...p.list, ...change } }));

const swipeLabels: Record<SwipeAction, () => string> = {
  pin: () => t("settings.swipePin"),
  delete: () => t("settings.swipeDelete"),
  copyLink: () => t("settings.swipeCopyLink"),
  none: () => t("settings.swipeNone"),
};

const picker = "w-auto min-w-[7.5rem] py-1.5 text-subheadline";

/** How the notes list sorts, groups and shows its rows, and what swipes do. */
export function NotesListPage() {
  const { list } = usePreferences();
  const byTitle = list.sort === "title";
  const swipeOptions = swipeActions.map((action) => ({
    value: action,
    label: swipeLabels[action](),
  }));
  return (
    <>
      <Section title={t("settings.notesList")}>
        <LabeledContent label={t("settings.sortBy")} wide>
          <SegmentedControl<ListPreferences["sort"]>
            label={t("settings.sortBy")}
            value={list.sort}
            onChange={(sort) => setList({ sort })}
            options={[
              { value: "edited", label: t("settings.sortEdited") },
              { value: "created", label: t("settings.sortCreated") },
              { value: "title", label: t("settings.sortTitle") },
            ]}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.order")} wide>
          <SegmentedControl<ListPreferences["order"]>
            label={t("settings.order")}
            value={list.order}
            onChange={(order) => setList({ order })}
            options={[
              {
                value: "standard",
                label: byTitle ? t("settings.orderAZ") : t("settings.orderNewest"),
              },
              {
                value: "reversed",
                label: byTitle ? t("settings.orderZA") : t("settings.orderOldest"),
              },
            ]}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.density")} wide>
          <SegmentedControl<ListPreferences["density"]>
            label={t("settings.density")}
            value={list.density}
            onChange={(density) => setList({ density })}
            options={[
              { value: "comfortable", label: t("settings.comfortable") },
              { value: "compact", label: t("settings.compact") },
            ]}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.preview")} description={t("settings.previewHint")}>
          <PickerInput
            label={t("settings.preview")}
            value={String(list.previewLines)}
            onChange={(lines) => setList({ previewLines: Number(lines) as PreviewLines })}
            className={picker}
            options={previewLineCounts.map((count) => ({
              value: String(count),
              label: count ? t("settings.previewLines", { count }) : t("settings.previewNone"),
            }))}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.showDates")} description={t("settings.showDatesHint")}>
          <Toggle
            label={t("settings.showDates")}
            checked={list.showDates}
            onChange={(showDates) => setList({ showDates })}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.showKinds")} description={t("settings.showKindsHint")}>
          <Toggle
            label={t("settings.showKinds")}
            checked={list.kindTags}
            onChange={(kindTags) => setList({ kindTags })}
          />
        </LabeledContent>
        <LabeledContent
          label={t("settings.pinnedOnTop")}
          description={t("settings.pinnedOnTopHint")}
        >
          <Toggle
            label={t("settings.pinnedOnTop")}
            checked={list.pinnedOnTop}
            onChange={(pinnedOnTop) => setList({ pinnedOnTop })}
          />
        </LabeledContent>
        <LabeledContent
          label={t("settings.groupByDate")}
          description={t("settings.groupByDateHint")}
        >
          <Toggle
            label={t("settings.groupByDate")}
            checked={list.groupByDate}
            onChange={(groupByDate) => setList({ groupByDate })}
          />
        </LabeledContent>
      </Section>
      <Section title={t("settings.swipeActions")} footer={t("settings.swipeFooter")}>
        <LabeledContent label={t("settings.swipeRight")}>
          <PickerInput<SwipeAction>
            label={t("settings.swipeRight")}
            value={list.swipeRight}
            onChange={(swipeRight) => setList({ swipeRight })}
            className={picker}
            options={swipeOptions}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.swipeLeft")}>
          <PickerInput<SwipeAction>
            label={t("settings.swipeLeft")}
            value={list.swipeLeft}
            onChange={(swipeLeft) => setList({ swipeLeft })}
            className={picker}
            options={swipeOptions}
          />
        </LabeledContent>
      </Section>
    </>
  );
}
