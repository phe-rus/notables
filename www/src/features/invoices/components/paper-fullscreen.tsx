import type { InvoiceDocument } from "@notables/core";
import { Button, CloseIcon, DownloadIcon, IconButton, PrintIcon, spring } from "@notables/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InvoicePaper, PAPER_HEIGHT, PAPER_WIDTH } from "./invoice-paper";

/**
 * The document on its own, as large as the screen allows, with download
 * and print at hand. Tap the page to see it at full size.
 */
export function PaperFullscreen({
  open,
  invoice,
  verifyLink,
  issuerId,
  onClose,
  onDownload,
  onPrint,
  downloading,
}: {
  open: boolean;
  invoice: InvoiceDocument;
  verifyLink: string | null;
  issuerId: string | null;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
  downloading: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${invoice.number} preview`}
          className="fixed inset-0 z-[70] flex flex-col bg-[#1d1b18]/80 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <header className="flex shrink-0 items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 text-white">
            <IconButton
              label="Close preview"
              onClick={onClose}
              className="text-white hover:bg-white/15"
            >
              <CloseIcon size={20} />
            </IconButton>
            <span className="truncate text-[15px] font-semibold">{invoice.number}</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="secondary" onClick={onPrint}>
                <PrintIcon size={16} />
                <span className="max-sm:hidden">Print</span>
              </Button>
              <Button variant="primary" onClick={onDownload} disabled={downloading || !verifyLink}>
                <DownloadIcon size={16} />
                <span className="max-sm:hidden">{downloading ? "Preparing…" : "Download PDF"}</span>
              </Button>
            </div>
          </header>
          <FittedPaper invoice={invoice} verifyLink={verifyLink} issuerId={issuerId} />
        </motion.div>
      )}
    </AnimatePresence>,
    window.document.body,
  );
}

function FittedPaper({
  invoice,
  verifyLink,
  issuerId,
}: {
  invoice: InvoiceDocument;
  verifyLink: string | null;
  issuerId: string | null;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.7);
  const [height, setHeight] = useState(PAPER_HEIGHT);
  const [zoomed, setZoomed] = useState(false);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () =>
      setFit(
        Math.min(
          (element.clientWidth - 32) / PAPER_WIDTH,
          (element.clientHeight - 32) / PAPER_HEIGHT,
          1.4,
        ),
      );
    measure();
    const observer = new ResizeObserver(() => {
      measure();
      if (paper.current) setHeight(paper.current.offsetHeight);
    });
    observer.observe(element);
    if (paper.current) observer.observe(paper.current);
    return () => observer.disconnect();
  }, []);

  // Full size is at least the width of the screen, so small text can be read.
  const scale = zoomed ? Math.max(1, fit * 1.8) : fit;

  return (
    <div ref={frame} className="min-h-0 grow overflow-auto px-4 pb-6">
      <motion.button
        type="button"
        aria-label={zoomed ? "Fit to screen" : "Zoom in"}
        onClick={() => setZoomed((value) => !value)}
        className="mx-auto block cursor-zoom-in overflow-hidden rounded-[4px] text-left shadow-[0_30px_80px_rgba(0,0,0,0.45)] data-[zoomed=true]:cursor-zoom-out"
        data-zoomed={zoomed}
        animate={{ width: PAPER_WIDTH * scale, height: height * scale }}
        transition={spring.smooth}
      >
        <motion.div
          ref={paper}
          style={{ width: PAPER_WIDTH, transformOrigin: "top left" }}
          animate={{ scale }}
          transition={spring.smooth}
        >
          <InvoicePaper invoice={invoice} verifyLink={verifyLink} issuerId={issuerId} />
        </motion.div>
      </motion.button>
    </div>
  );
}
