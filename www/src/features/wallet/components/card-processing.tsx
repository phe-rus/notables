import { NfcReadIcon, ScanCodeIcon } from "@phe-rus/hino";
import { motion, useReducedMotion } from "motion/react";
import { t } from "../../../i18n/i18n";

/** Recognition has no measurable upload percentage: show activity, not invented progress. */
export function CardProcessing({ nfc = false }: { nfc?: boolean }) {
  const reduced = useReducedMotion();
  const Icon = nfc ? NfcReadIcon : ScanCodeIcon;
  return (
    <div role="status" aria-busy="true" className="flex flex-col items-center gap-5 py-5">
      <div
        aria-hidden="true"
        className="relative flex aspect-[85.6/54] w-full max-w-xs items-center justify-center overflow-hidden rounded-3xl border border-separator/60 bg-paper"
      >
        <div className="absolute inset-3 rounded-2xl border border-accent/20" />
        <Icon size={38} className="text-accent-text/70" />
        {!nfc && (
          <motion.div
            className="absolute inset-x-6 top-1/2 h-px bg-accent/60 shadow-sm"
            animate={reduced ? undefined : { y: [-52, 52, -52], opacity: [0.25, 0.8, 0.25] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      <div className="flex items-center gap-2.5 text-footnote text-label-secondary">
        <motion.span
          aria-hidden="true"
          className="size-3.5 rounded-full border-2 border-accent/20 border-t-accent"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        {t(nfc ? "wallet.nfcWaiting" : "wallet.recognizing")}
      </div>
    </div>
  );
}
