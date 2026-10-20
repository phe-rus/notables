import type { ReactNode } from "react";
import type { updateDestinations } from "./constants";

export type ReleaseChannel = keyof typeof updateDestinations;
export type AppRelease = { version: string; build: number; availableAt: string };
export type ReleaseManifest = {
  schema: 1;
  channels: Partial<Record<ReleaseChannel, AppRelease | null>>;
};
export type InstalledRelease = { version: string; build: number; channel: ReleaseChannel };
export type UpdateState = {
  installed: InstalledRelease | null;
  release: AppRelease | null;
  required: boolean;
  deadline: number | null;
  checking: boolean;
  failed: boolean;
};
export type UpdateDependencies = {
  installed: InstalledRelease;
  load: () => Promise<unknown>;
  read: () => string | null;
  write: (value: string) => void;
  now: () => number;
};
export type UpdateMonitor = {
  getState: () => UpdateState;
  subscribe: (listener: () => void) => () => void;
  check: () => Promise<void>;
  tick: () => void;
};
export type AppUpdateBoundaryProps = { children: ReactNode };
export type UpdateAction = { openFailed: boolean; update: () => Promise<void> };
export type UpdateActionsProps = { onUpdate: () => void } & (
  | { required: true; checking: boolean; onCheck: () => void }
  | { required: false; onDismiss: () => void }
);
export type UpdateRequiredScreenProps = {
  version: string;
  checking: boolean;
  error: string | null;
  onUpdate: () => void;
  onCheck: () => void;
};
export type UpdateAvailableDialogProps = {
  open: boolean;
  version: string;
  deadline: number;
  openFailed: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onDismiss: () => void;
};
