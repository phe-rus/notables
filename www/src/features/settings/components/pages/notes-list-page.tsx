import { LabeledContent, Section, SegmentedControl, Toggle } from "@ultrapeach/ui";
import { PickerInput } from "../../../../components/form/form-fields";
import { t } from "../../../../i18n/i18n";
import {
  type ListPreferences,
  type PreviewLines,
  previewLineCounts,
} from "../../model/preferences";
import { updatePreferences, usePreferences } from "../../store/preferences-store";

const setList = (change: Partial<ListPreferences>) =>
  updatePreferences((p) => ({ ...p, list: { ...p.list, ...change } }));

/** How the notes list sorts, groups and shows its rows. */
export function NotesListPage() {
  const { list } = usePreferences();
  return (
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
          className="w-auto min-w-[7.5rem] py-1.5 text-subheadline"
          options={previewLineCounts.map((count) => ({
            value: String(count),
            label: count ? t("settings.previewLines", { count }) : t("settings.previewNone"),
          }))}
        />
      </LabeledContent>
      <LabeledContent label={t("settings.showKinds")} description={t("settings.showKindsHint")}>
        <Toggle
          label={t("settings.showKinds")}
          checked={list.kindTags}
          onChange={(kindTags) => setList({ kindTags })}
        />
      </LabeledContent>
      <LabeledContent label={t("settings.groupByDate")} description={t("settings.groupByDateHint")}>
        <Toggle
          label={t("settings.groupByDate")}
          checked={list.groupByDate}
          onChange={(groupByDate) => setList({ groupByDate })}
        />
      </LabeledContent>
    </Section>
  );
}
