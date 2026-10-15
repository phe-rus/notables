import {
  BellIcon,
  BrushIcon,
  HeadphonesIcon,
  LayoutIcon,
  LinkIcon,
  LockIcon,
  NoteIcon,
  SidebarIcon,
  SparkleIcon,
  TouchIcon,
  VerifiedIcon,
} from "@phe-rus/hino";
import type { ReactNode } from "react";
import { t } from "../../../i18n/i18n";
import { hapticsAvailable } from "../../../platform/haptics";
import { isTauri } from "../../../platform/runtime";
import { inBrowserSession } from "../../../platform/session/browser-session-store";
import { AiSettingsSection } from "../../ai/components/ai-settings-section";
import { ReminderSettingsSection } from "../../calendar/components/reminder-settings-section";
import { BrowserSessionPage } from "../../devices/components/browser-session-page";
import { LinkedDevicesPage } from "../../devices/components/linked-devices-page";
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
  "devices",
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

/** A browser showing a phone's notes leaves the phone's own settings to the phone (spec 0005, AC-28). */
const onDevice =
  (check: () => boolean = () => true) =>
  () =>
    !inBrowserSession() && check();

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
  devices: page({
    id: "devices",
    get title() {
      return t("devices.title");
    },
    icon: <LinkIcon size={17} />,
    content: () => (inBrowserSession() ? <BrowserSessionPage /> : <LinkedDevicesPage />),
    available: () => isTauri() || inBrowserSession(),
  }),
  privacy: page({
    id: "privacy",
    get title() {
      return t("settings.privacy");
    },
    icon: <LockIcon size={17} />,
    content: () => <PrivacyPage />,
    available: onDevice(),
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
    available: onDevice(),
  }),
  reminders: page({
    id: "reminders",
    get title() {
      return t("reminders.title");
    },
    icon: <BellIcon size={17} />,
    content: () => <ReminderSettingsSection />,
    available: onDevice(),
  }),
  haptics: page({
    id: "haptics",
    get title() {
      return t("haptics.title");
    },
    icon: <TouchIcon size={17} />,
    content: () => <HapticsSettingsSection />,
    available: onDevice(hapticsAvailable),
  }),
  widgets: page({
    id: "widgets",
    get title() {
      return t("widgets.title");
    },
    icon: <LayoutIcon size={17} />,
    content: () => <WidgetsSettingsSection />,
    available: onDevice(isTauri),
  }),
  ai: page({
    id: "ai",
    get title() {
      return t("settings.ai");
    },
    icon: <SparkleIcon size={17} />,
    content: () => <AiSettingsSection />,
    available: onDevice(),
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
  ["devices", "privacy"],
  ["listening", "reminders", "haptics", "widgets", "ai"],
  ["about"],
];
