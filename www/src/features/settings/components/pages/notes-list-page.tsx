import { LabeledContent, Section, Toggle } from "@phe-rus/hino";
import { PickerInput } from "@/components/form/form-fields";
import { type NoteFont, noteFontLabels, noteFonts } from "@/features/library/model/note-fonts";
import { ExamplesSettingsSection } from "@/features/onboarding/components/examples-settings-section";
import {
  type ListPreferences,
  type PreviewLines,
  previewLineCounts,
  type SwipeAction,
  swipeActions,
} from "@/features/settings/model/preferences";
import { updatePreferences, usePreferences } from "@/features/settings/store/preferences-store";
import { t } from "@/i18n/i18n";

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
  const { list, noteFont } = usePreferences();
  const byTitle = list.sort === "title";
  const swipeOptions = swipeActions.map((action) => ({
    value: action,
    label: swipeLabels[action](),
  }));
  return (
    <>
      <Section title={t("settings.sorting")}>
        <LabeledContent label={t("settings.sortBy")}>
          <PickerInput<ListPreferences["sort"]>
            className={picker}
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
        <LabeledContent label={t("settings.order")}>
          <PickerInput<ListPreferences["order"]>
            className={picker}
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
        <LabeledContent label={t("settings.pinnedOnTop")}>
          <Toggle
            label={t("settings.pinnedOnTop")}
            checked={list.pinnedOnTop}
            onChange={(pinnedOnTop) => setList({ pinnedOnTop })}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.groupByDate")}>
          <Toggle
            label={t("settings.groupByDate")}
            checked={list.groupByDate}
            onChange={(groupByDate) => setList({ groupByDate })}
          />
        </LabeledContent>
      </Section>
      <Section title={t("settings.display")}>
        <LabeledContent label={t("settings.noteFont")}>
          <PickerInput<NoteFont>
            label={t("settings.noteFont")}
            className={picker}
            value={noteFont}
            onChange={(noteFont) => updatePreferences((p) => ({ ...p, noteFont }))}
            options={noteFonts.map((font) => ({ value: font, label: noteFontLabels[font] }))}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.density")}>
          <PickerInput<ListPreferences["density"]>
            className={picker}
            label={t("settings.density")}
            value={list.density}
            onChange={(density) => setList({ density })}
            options={[
              { value: "comfortable", label: t("settings.comfortable") },
              { value: "compact", label: t("settings.compact") },
            ]}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.preview")}>
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
        <LabeledContent label={t("settings.showDates")}>
          <Toggle
            label={t("settings.showDates")}
            checked={list.showDates}
            onChange={(showDates) => setList({ showDates })}
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
      <ExamplesSettingsSection />
    </>
  );
}
