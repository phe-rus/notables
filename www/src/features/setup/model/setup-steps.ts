import type { SetupStep } from "./types";

export const SETUP_STEP_KEY = "notables:setup-step";
export const setupSteps: SetupStep[] = [
  "intro",
  "licence",
  "name",
  "look",
  "language",
  "permissions",
  "ai",
  "done",
];
