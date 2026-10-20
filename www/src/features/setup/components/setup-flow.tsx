import { cn, spring } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { skipWelcomeExamples } from "@/features/onboarding/lib/seed-welcome-library";
import { AppearanceSync } from "@/features/settings/components/appearance-sync";
import { t } from "@/i18n/i18n";
import { markAppReady } from "@/platform/app-ready";
import { savedSetupStep } from "../lib/saved-setup-step";
import { markSetupDone } from "../lib/setup-state";
import { SETUP_STEP_KEY, setupSteps } from "../model/setup-steps";
import { AiStep } from "./ai-step";
import { DoneStep } from "./done-step";
import { IntroStep } from "./intro-step";
import { LanguageStep } from "./language-step";
import { LicenceStep } from "./licence-step";
import { LookStep } from "./look-step";
import { NameStep } from "./name-step";
import { PermissionsStep } from "./permissions-step";

export function SetupFlow() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [index, setIndex] = useState(savedSetupStep);
  const [heading, setHeading] = useState<1 | -1>(1);
  const [agreed, setAgreed] = useState(false);
  const [examples, setExamples] = useState(true);
  const step = setupSteps[index] ?? "intro";

  useEffect(() => markAppReady(), []);

  // Changing language redraws the app; carry on from the same step.
  useEffect(() => {
    try {
      sessionStorage.setItem(SETUP_STEP_KEY, String(index));
    } catch {
      // Starts over after a language change.
    }
  }, [index]);

  const go = (delta: 1 | -1) => {
    setHeading(delta);
    setIndex((value) => Math.min(setupSteps.length - 1, Math.max(0, value + delta)));
  };
  const finish = () => {
    if (!examples) skipWelcomeExamples();
    markSetupDone();
    try {
      sessionStorage.removeItem(SETUP_STEP_KEY);
    } catch {
      // Nothing to clear.
    }
    void navigate({ to: "/", replace: true });
  };

  const canContinue = step !== "licence" || agreed;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Theme and accent choices take effect as they're picked. */}
      <AppearanceSync />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-[max(18px,env(safe-area-inset-top))]">
        <p className="sr-only">
          {t("setup.stepOf", { step: index + 1, total: setupSteps.length })}
        </p>
        <div className="flex gap-1.5" aria-hidden="true">
          {setupSteps.map((id, position) => (
            <motion.span
              key={id}
              className="h-1.5 rounded-full bg-accent"
              animate={{
                width: position === index ? 22 : 6,
                opacity: position <= index ? 1 : 0.25,
              }}
              transition={reducedMotion ? { duration: 0 } : spring.snappy}
            />
          ))}
        </div>
        {step !== "done" && step !== "licence" && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setHeading(1);
              setIndex(setupSteps.indexOf("done"));
            }}
            className={cn(
              "text-label-secondary",
              index < setupSteps.indexOf("licence") + 1 && "invisible",
            )}
          >
            {t("setup.skip")}
          </Button>
        )}
      </header>

      <main
        className={cn(
          "mx-auto flex w-full grow flex-col justify-center px-6 py-8",
          step === "intro" ? "max-w-3xl" : "max-w-md md:max-w-lg",
        )}
      >
        <AnimatePresence mode="wait" initial={false} custom={heading}>
          <motion.div
            key={step}
            custom={heading}
            variants={{
              enter: (from: number) => ({ opacity: 0, x: reducedMotion ? 0 : from * 20 }),
              center: { opacity: 1, x: 0 },
              exit: (from: number) => ({ opacity: 0, x: reducedMotion ? 0 : from * -20 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reducedMotion ? { duration: 0 } : spring.smooth}
            className={cn(
              "flex flex-col gap-5",
              step === "intro" && "md:grid md:grid-cols-[.85fr_1.15fr] md:items-center md:gap-12",
            )}
          >
            {step === "intro" && <IntroStep />}
            {step === "licence" && <LicenceStep agreed={agreed} onAgree={setAgreed} />}
            {step === "name" && <NameStep onSubmit={() => go(1)} />}
            {step === "look" && <LookStep />}
            {step === "language" && <LanguageStep />}
            {step === "permissions" && <PermissionsStep />}
            {step === "ai" && <AiStep />}
            {step === "done" && <DoneStep examples={examples} onExamples={setExamples} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-6 pb-[max(24px,env(safe-area-inset-bottom))] md:max-w-lg">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => go(-1)}
          className={cn(index === 0 && "invisible")}
        >
          {t("common.back")}
        </Button>
        {step === "done" ? (
          <Button variant="default" size="sm" className="min-w-28" onClick={finish}>
            {t("setup.startWriting")}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="min-w-28"
            disabled={!canContinue}
            onClick={() => go(1)}
          >
            {step === "intro"
              ? t("setup.getStarted")
              : step === "ai"
                ? t("setup.continueWithoutAi")
                : t("common.continue")}
          </Button>
        )}
      </footer>
    </div>
  );
}
