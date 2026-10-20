import type { ReactNode } from "react";
import type { DevicePlatform } from "@/platform/device-platform";
import type { PermissionKind } from "@/platform/permissions";

export type SetupStep =
  | "intro"
  | "licence"
  | "name"
  | "look"
  | "language"
  | "permissions"
  | "ai"
  | "done";
export type StepTitleProps = { title: string; children?: ReactNode };
export type LicenceStepProps = { agreed: boolean; onAgree: (value: boolean) => void };
export type NameStepProps = { onSubmit: () => void };
export type DoneStepProps = { examples: boolean; onExamples: (value: boolean) => void };
export type StartChoiceProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
};
export type PermissionRowProps = { kind: PermissionKind; device: DevicePlatform };
export type PermissionCopy = { title: string; body: string; icon: ReactNode };
export type SetupHighlight = { icon: ReactNode; title: string; body: string };
