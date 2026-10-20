import { CheckIcon, spring } from "@phe-rus/hino";
import { motion, useReducedMotion } from "motion/react";
import { t } from "@/i18n/i18n";
import { useAuthorName } from "@/platform/author-preferences";
import type { DoneStepProps } from "../model/types";
import { StartChoice } from "./start-choice";
import { StepTitle } from "./step-title";

export function DoneStep({ examples, onExamples }: DoneStepProps) {
  const reducedMotion = useReducedMotion();
  const name = useAuthorName().trim();
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.span
        className="flex size-16 items-center justify-center rounded-full bg-accent text-on-accent"
        initial={reducedMotion ? false : { scale: 0.8, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring.bouncy}
      >
        <CheckIcon size={28} strokeWidth={3} />
      </motion.span>
      <StepTitle
        title={
          name ? t("setup.allSetName", { name: name.split(" ")[0] ?? name }) : t("setup.allSet")
        }
      >
        {t("setup.allSetBody")}
      </StepTitle>
      <fieldset
        aria-label={t("examples.choice")}
        className="grid w-full gap-2.5 text-start sm:grid-cols-2"
      >
        <StartChoice
          selected={examples}
          onSelect={() => onExamples(true)}
          title={t("examples.withExamples")}
          body={t("examples.withExamplesBody")}
        />
        <StartChoice
          selected={!examples}
          onSelect={() => onExamples(false)}
          title={t("examples.fresh")}
          body={t("examples.freshBody")}
        />
      </fieldset>
    </div>
  );
}
