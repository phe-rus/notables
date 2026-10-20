import { SETUP_STEP_KEY, setupSteps } from "../model/setup-steps";

export function savedSetupStep(): number {
  try {
    const step = Number(sessionStorage.getItem(SETUP_STEP_KEY));
    return Number.isInteger(step) && step > 0 && step < setupSteps.length ? step : 0;
  } catch {
    return 0;
  }
}
