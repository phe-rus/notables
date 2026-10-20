import { BookIcon, InvoiceIcon, MicIcon, PenIcon, spring } from "@phe-rus/hino";
import { motion, useReducedMotion } from "motion/react";
import { AppMark } from "@/components/brand/app-mark";
import { t } from "@/i18n/i18n";
import type { SetupHighlight } from "../model/types";
import { StepTitle } from "./step-title";

export function IntroStep() {
  const reducedMotion = useReducedMotion();
  const highlights: SetupHighlight[] = [
    {
      icon: <PenIcon size={20} />,
      title: t("setup.writeAnything"),
      body: t("setup.writeAnythingBody"),
    },
    {
      icon: <BookIcon size={20} />,
      title: t("setup.makeBooks"),
      body: t("setup.makeBooksBody"),
    },
    {
      icon: <MicIcon size={20} />,
      title: t("setup.record"),
      body: t("setup.recordBody"),
    },
    {
      icon: <InvoiceIcon size={20} />,
      title: t("setup.invoices"),
      body: t("setup.invoicesBody"),
    },
  ];
  return (
    <>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="splash-mark">
          <AppMark size={64} />
        </div>
        <StepTitle title={t("setup.welcome")}>{t("setup.welcomeBody")}</StepTitle>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {highlights.map((item, position) => (
          <motion.li
            key={item.title}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: reducedMotion ? 0 : 0.06 * position }}
            className="flex gap-3 rounded-2xl border border-separator/60 bg-elevated p-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              {item.icon}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-subheadline font-semibold">{item.title}</span>
              <span className="text-footnote leading-snug text-label-secondary">{item.body}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </>
  );
}
