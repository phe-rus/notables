import { accents } from "@notables/tokens";
import { IconButton, SegmentedControl, SidebarIcon, SwatchPicker, Switch } from "@notables/ui";
import { AppMark } from "../../../components/brand/app-mark";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { setAuthorName, useAuthorName } from "../../../platform/author-preferences";
import { isTauri } from "../../../platform/runtime";
import { AiSettingsSection } from "../../ai/components/ai-settings-section";
import { sidebarIcons } from "../../library/components/library-sidebar";
import { SidebarEditor } from "../../library/components/sidebar-editor";
import { type NoteFont, noteFontLabels, noteFonts } from "../../library/model/note-fonts";
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
          <IconButton label="Show library" className="lg:hidden" onClick={onOpenSidebar}>
            <SidebarIcon size={20} />
          </IconButton>
          <h1 className="text-[22px] font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="flex grow flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-4 pt-4 pb-32 sm:px-5 md:pb-24">
          <SettingsGroup title="Appearance">
            <SettingsRow label="Theme" wide>
              <SegmentedControl<ThemePreference>
                label="Theme"
                value={preferences.theme}
                onChange={(theme) => set({ theme })}
                options={[
                  { value: "system", label: "Auto" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </SettingsRow>
            <SettingsRow label="Accent" description="Highlights, selections and buttons." stacked>
              <SwatchPicker
                label="Accent colour"
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
            <SettingsRow label="Text size" description="Writing and reading." wide>
              <SegmentedControl<TextSize>
                label="Text size"
                value={preferences.textSize}
                onChange={(textSize) => set({ textSize })}
                options={(Object.keys(textSizes) as TextSize[]).map((size) => ({
                  value: size,
                  label: textSizes[size].label,
                }))}
              />
            </SettingsRow>
            <SettingsRow label="Note font" description="Notes can also choose their own." wide>
              <SegmentedControl<NoteFont>
                label="Note font"
                value={preferences.noteFont}
                onChange={(noteFont) => set({ noteFont })}
                options={noteFonts.map((font) => ({ value: font, label: noteFontLabels[font] }))}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Notes list">
            <SettingsRow label="Sort by" wide>
              <SegmentedControl<ListPreferences["sort"]>
                label="Sort notes by"
                value={list.sort}
                onChange={(sort) => setList({ sort })}
                options={[
                  { value: "edited", label: "Edited" },
                  { value: "created", label: "Created" },
                  { value: "title", label: "Title" },
                ]}
              />
            </SettingsRow>
            <SettingsRow label="Density" wide>
              <SegmentedControl<ListPreferences["density"]>
                label="List density"
                value={list.density}
                onChange={(density) => setList({ density })}
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </SettingsRow>
            <SettingsRow label="Show preview" description="The first lines under each title.">
              <Switch
                label="Show preview"
                checked={list.preview}
                onChange={(preview) => setList({ preview })}
              />
            </SettingsRow>
            <SettingsRow label="Show kinds" description="Journal, Story, Lesson…">
              <Switch
                label="Show kinds"
                checked={list.kindTags}
                onChange={(kindTags) => setList({ kindTags })}
              />
            </SettingsRow>
            <SettingsRow label="Group by date" description="Today, Yesterday, This week…">
              <Switch
                label="Group by date"
                checked={list.groupByDate}
                onChange={(groupByDate) => setList({ groupByDate })}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup
            title="Sidebar"
            footer="Drag to reorder. All Notes, Search and Settings always stay. You can also drag the sidebar’s edge to resize it."
          >
            <div className="px-2.5 py-2">
              <SidebarEditor icons={sidebarIcons} />
            </div>
            <SettingsRow label="Show counts">
              <Switch
                label="Show counts"
                checked={sidebar.counts}
                onChange={(counts) => setSidebar({ counts })}
              />
            </SettingsRow>
            <SettingsRow label="Width" description={`${sidebar.width} points`}>
              <button
                type="button"
                disabled={sidebar.width === sidebarWidth.default}
                onClick={() => setSidebar({ width: sidebarWidth.default })}
                className="text-[14px] font-medium text-accent-text disabled:text-label-tertiary"
              >
                Reset
              </button>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup
            title="You"
            footer="Shown on what you publish. Notables needs no account; signing in for backup will be optional."
          >
            <SettingsRow label="Name" stacked>
              <input
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                maxLength={80}
                placeholder="Your name or pen name"
                aria-label="Your name"
                className="w-full rounded-[10px] control-field px-3 py-2 text-[15px] text-label placeholder:text-label-tertiary"
              />
            </SettingsRow>
          </SettingsGroup>

          <AiSettingsSection />

          <SettingsGroup title="About">
            <div className="flex items-center gap-4 px-4 py-4">
              <AppMark size={52} />
              <div className="flex flex-col">
                <span className="text-[17px] font-semibold">Notables</span>
                <span className="text-[13px] text-label-secondary">
                  Version 0.1 ·{" "}
                  {isTauri() ? "Notes stored on this device" : "Notes stored in this browser"}
                </span>
              </div>
            </div>
          </SettingsGroup>
        </div>
      </div>
    </div>
  );
}
