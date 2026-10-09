import {
  BellIcon,
  BrushIcon,
  HeadphonesIcon,
  LayoutIcon,
  LockIcon,
  NoteIcon,
  SidebarIcon,
  SparkleIcon,
  TouchIcon,
  VerifiedIcon,
} from "@ultrapeach/ui";
import type { ReactNode } from "react";
import { t } from "../../../i18n/i18n";
import { hapticsAvailable } from "../../../platform/haptics";
import { isTauri } from "../../../platform/runtime";
import { AiSettingsSection } from "../../ai/components/ai-settings-section";
import { ReminderSettingsSection } from "../../calendar/components/reminder-settings-section";
import { ListeningSettingsSection } from "../../listening/components/listening-settings-section";
import { ModelPacksSection } from "../../listening/components/model-packs-section";
import { WidgetsSettingsSection } from "../../widgets/components/widgets-settings-section";
import { HapticsSettingsSection } from "./haptics-settings-section";
import { AboutPage } from "./pages/about-page";
import { AppearancePage } from "./pages/appearance-page";
import { NotesListPage } from "./pages/notes-list-page";
import { PrivacyPage } from "./pages/privacy-page";
import { ProfilePage } from "./pages/profile-page";
import { SidebarPage } from "./pages/sidebar-page";

export const settingsPageIds = [
  "profile",
  "appearance",
  "notes",
  "sidebar",
  "privacy",
  "listening",
  "reminders",
  "haptics",
  "widgets",
  "ai",
  "about",
] as const;
export type SettingsPageId = (typeof settingsPageIds)[number];

export const isSettingsPageId = (value: string): value is SettingsPageId =>
  (settingsPageIds as readonly string[]).includes(value);

export interface SettingsPage {
  id: SettingsPageId;
  readonly title: string;
  icon: ReactNode;
  content: () => ReactNode;
  /** Shown only where it means something (haptics need a vibration motor). */
  available?: () => boolean;
}

const page = (entry: SettingsPage) => entry;

export const settingsPages: Record<SettingsPageId, SettingsPage> = {
  profile: page({
    id: "profile",
    get title() {
      return t("settings.you");
    },
    icon: null,
    content: () => <ProfilePage />,
  }),
  appearance: page({
    id: "appearance",
    get title() {
      return t("settings.appearance");
    },
    icon: <BrushIcon size={17} />,
    content: () => <AppearancePage />,
  }),
  notes: page({
    id: "notes",
    get title() {
      return t("settings.notesList");
    },
    icon: <NoteIcon size={17} />,
    content: () => <NotesListPage />,
  }),
  sidebar: page({
    id: "sidebar",
    get title() {
      return t("settings.sidebar");
    },
    icon: <SidebarIcon size={17} />,
    content: () => <SidebarPage />,
  }),
  privacy: page({
    id: "privacy",
    get title() {
      return t("settings.privacy");
    },
    icon: <LockIcon size={17} />,
    content: () => <PrivacyPage />,
  }),
  listening: page({
    id: "listening",
    get title() {
      return t("listening.title");
    },
    icon: <HeadphonesIcon size={17} />,
    content: () => (
      <>
        <ListeningSettingsSection />
        <ModelPacksSection />
      </>
    ),
  }),
  reminders: page({
    id: "reminders",
    get title() {
      return t("reminders.title");
    },
    icon: <BellIcon size={17} />,
    content: () => <ReminderSettingsSection />,
  }),
  haptics: page({
    id: "haptics",
    get title() {
      return t("haptics.title");
    },
    icon: <TouchIcon size={17} />,
    content: () => <HapticsSettingsSection />,
    available: hapticsAvailable,
  }),
  widgets: page({
    id: "widgets",
    get title() {
      return t("widgets.title");
    },
    icon: <LayoutIcon size={17} />,
    content: () => <WidgetsSettingsSection />,
    available: isTauri,
  }),
  ai: page({
    id: "ai",
    get title() {
      return t("settings.ai");
    },
    icon: <SparkleIcon size={17} />,
    content: () => <AiSettingsSection />,
  }),
  about: page({
    id: "about",
    get title() {
      return t("settings.about");
    },
    icon: <VerifiedIcon size={17} />,
    content: () => <AboutPage />,
  }),
};

/** The list's groups, as iOS Settings groups its rows. */
export const settingsGroups: readonly (readonly SettingsPageId[])[] = [
  ["appearance", "notes", "sidebar"],
  ["privacy"],
  ["listening", "reminders", "haptics", "widgets", "ai"],
  ["about"],
];
