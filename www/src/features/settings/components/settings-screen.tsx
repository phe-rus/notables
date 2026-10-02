import { accents } from "@notables/tokens";
import { IconButton, SegmentedControl, SidebarIcon, SwatchPicker, Switch } from "@notables/ui";
import { AppMark } from "../../../components/brand/app-mark";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { type LanguageChoice, setLanguageChoice, t, useLanguageChoice } from "../../../i18n/i18n";
import { languages } from "../../../i18n/languages";
import { setAuthorName, useAuthorName } from "../../../platform/author-preferences";
import { isTauri } from "../../../platform/runtime";
import { AiSettingsSection } from "../../ai/components/ai-settings-section";
import { ReminderSettingsSection } from "../../calendar/components/reminder-settings-section";
import { sidebarIcons } from "../../library/components/library-sidebar";
import { SidebarEditor } from "../../library/components/sidebar-editor";
import { type NoteFont, noteFontLabels, noteFonts } from "../../library/model/note-fonts";
import { ListeningSettingsSection } from "../../listening/components/listening-settings-section";
import { ModelPacksSection } from "../../listening/components/model-packs-section";
import { WidgetsSettingsSection } from "../../widgets/components/widgets-settings-section";
import {
  type ListPreferences,
  type Preferences,
  sidebarWidth,
  type TextSize,
  type ThemePreference,
  textSizes,
} from "../model/preferences";
import { updatePreferences, usePreferences } from "../store/preferences-store";
import { SettingsGroup, SettingsRow } from "./settings-controls";

const set = (change: Partial<Preferences>) => updatePreferences((p) => ({ ...p, ...change }));
const setList = (change: Partial<ListPreferences>) =>
  updatePreferences((p) => ({ ...p, list: { ...p.list, ...change } }));
const setSidebar = (change: Partial<Preferences["sidebar"]>) =>
  updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, ...change } }));

export function SettingsScreen({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const preferences = usePreferences();
  const languageChoice = useLanguageChoice();
  const authorName = useAuthorName();
  const { list, sidebar } = preferences;

  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2"
      >
        {sidebar.collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center gap-1">
          <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
            <SidebarIcon size={20} />
          </IconButton>
          <h1 className="text-[22px] font-bold tracking-tight">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="flex grow flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-4 pt-4 pb-32 sm:px-5 md:pb-24">
          <SettingsGroup title={t("settings.appearance")}>
            <SettingsRow label={t("settings.theme")} wide>
              <SegmentedControl<ThemePreference>
                label={t("settings.theme")}
                value={preferences.theme}
                onChange={(theme) => set({ theme })}
                options={[
                  { value: "system", label: t("settings.themeAuto") },
                  { value: "light", label: t("settings.themeLight") },
                  { value: "dark", label: t("settings.themeDark") },
                ]}
              />
            </SettingsRow>
            <SettingsRow
              label={t("settings.accent")}
              description={t("settings.accentHint")}
              stacked
            >
              <SwatchPicker
                label={t("setup.accentColour")}
                value={preferences.accent}
                onChange={(accent) => set({ accent })}
                options={Object.values(accents).map((accent) => ({
                  value: accent.id,
                  label: accent.name,
                  color: accent.light.accent,
                  ink: accent.light.onAccent,
                }))}
              />
            </SettingsRow>
            <SettingsRow
              label={t("settings.textSize")}
              description={t("settings.textSizeHint")}
              wide
            >
              <SegmentedControl<TextSize>
                label={t("settings.textSize")}
                value={preferences.textSize}
                onChange={(textSize) => set({ textSize })}
                options={(Object.keys(textSizes) as TextSize[]).map((size) => ({
                  value: size,
                  label: textSizes[size].label,
                }))}
              />
            </SettingsRow>
            <SettingsRow
              label={t("settings.noteFont")}
              description={t("settings.noteFontHint")}
              wide
            >
              <SegmentedControl<NoteFont>
                label={t("settings.noteFont")}
                value={preferences.noteFont}
                onChange={(noteFont) => set({ noteFont })}
                options={noteFonts.map((font) => ({ value: font, label: noteFontLabels[font] }))}
              />
            </SettingsRow>
            <SettingsRow label={t("settings.language")} description={t("settings.languageHint")}>
              <select
                aria-label={t("settings.language")}
                value={languageChoice}
                onChange={(event) => setLanguageChoice(event.target.value as LanguageChoice)}
                className="rounded-[10px] control-field px-3 py-1.5 text-[15px] text-label"
              >
                <option value="system">{t("settings.languageSystem")}</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id} lang={language.id}>
                    {language.name}
                  </option>
                ))}
              </select>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title={t("settings.notesList")}>
            <SettingsRow label={t("settings.sortBy")} wide>
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
            </SettingsRow>
            <SettingsRow label={t("settings.density")} wide>
              <SegmentedControl<ListPreferences["density"]>
                label={t("settings.density")}
                value={list.density}
                onChange={(density) => setList({ density })}
                options={[
                  { value: "comfortable", label: t("settings.comfortable") },
                  { value: "compact", label: t("settings.compact") },
                ]}
              />
            </SettingsRow>
            <SettingsRow
              label={t("settings.showPreview")}
              description={t("settings.showPreviewHint")}
            >
              <Switch
                label={t("settings.showPreview")}
                checked={list.preview}
                onChange={(preview) => setList({ preview })}
              />
            </SettingsRow>
            <SettingsRow label={t("settings.showKinds")} description={t("settings.showKindsHint")}>
              <Switch
                label={t("settings.showKinds")}
                checked={list.kindTags}
                onChange={(kindTags) => setList({ kindTags })}
              />
            </SettingsRow>
            <SettingsRow
              label={t("settings.groupByDate")}
              description={t("settings.groupByDateHint")}
            >
              <Switch
                label={t("settings.groupByDate")}
                checked={list.groupByDate}
                onChange={(groupByDate) => setList({ groupByDate })}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title={t("settings.sidebar")} footer={t("settings.sidebarFooter")}>
            <div className="px-2.5 py-2">
              <SidebarEditor icons={sidebarIcons} />
            </div>
            <SettingsRow label={t("settings.showCounts")}>
              <Switch
                label={t("settings.showCounts")}
                checked={sidebar.counts}
                onChange={(counts) => setSidebar({ counts })}
              />
            </SettingsRow>
            <SettingsRow
              label={t("settings.width")}
              description={t("settings.widthPoints", { count: sidebar.width })}
            >
              <button
                type="button"
                disabled={sidebar.width === sidebarWidth.default}
                onClick={() => setSidebar({ width: sidebarWidth.default })}
                className="text-[14px] font-medium text-accent-text disabled:text-label-tertiary"
              >
                {t("common.reset")}
              </button>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title={t("settings.you")} footer={t("settings.youFooter")}>
            <SettingsRow label={t("settings.name")} stacked>
              <input
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                maxLength={80}
                placeholder={t("settings.namePlaceholder")}
                aria-label={t("settings.name")}
                className="w-full rounded-[10px] control-field px-3 py-2 text-[15px] text-label placeholder:text-label-tertiary"
              />
            </SettingsRow>
          </SettingsGroup>

          <ListeningSettingsSection />
          <ModelPacksSection />

          <ReminderSettingsSection />

          <WidgetsSettingsSection />

          <AiSettingsSection />

          <SettingsGroup title={t("settings.about")}>
            <div className="flex items-center gap-4 px-4 py-4">
              <AppMark size={52} />
              <div className="flex flex-col">
                <span className="text-[17px] font-semibold">Notables</span>
                <span className="text-[13px] text-label-secondary">
                  {t("settings.version", { version: "0.1" })} ·{" "}
                  {isTauri() ? t("settings.storedDevice") : t("settings.storedBrowser")}
                </span>
              </div>
            </div>
          </SettingsGroup>
        </div>
      </div>
    </div>
  );
}
