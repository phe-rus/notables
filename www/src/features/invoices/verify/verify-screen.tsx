import { extractSeal, type SealCheck, verifySeal } from "@notables/core";
import { PhotoIcon, ScanCodeIcon, spring } from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { QrScanner, readCodeFromImage } from "./qr-scanner";
import { SealResult } from "./seal-result";

/**
 * Checks an invoice, receipt or quote. Opened from the QR code with any
 * phone camera (the seal is in the link's fragment and never leaves the
 * device), or used here to scan a code, choose a photo of one, or paste a
 * link or the seal text copied from a PDF.
 */
export function VerifyScreen() {
  const [check, setCheck] = useState<SealCheck | null>(null);
  const [scanning, setScanning] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const evaluate = useCallback((text: string) => {
    const seal = extractSeal(text);
    setScanning(false);
    if (!seal) {
      setProblem("That isn’t a Notables verification code.");
      return;
    }
    setProblem(null);
    setCheck(verifySeal(seal));
  }, []);

  useEffect(() => {
    const fromLink = () => {
      if (window.location.hash.length > 1) evaluate(window.location.hash);
    };
    fromLink();
    window.addEventListener("hashchange", fromLink);
    return () => window.removeEventListener("hashchange", fromLink);
  }, [evaluate]);

  const reset = () => {
    setCheck(null);
    setPasted("");
    setProblem(null);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  };

  const onUnavailable = useCallback((reason: string) => {
    setScanning(false);
    setProblem(reason);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="flex items-center gap-2 text-[15px] font-semibold text-label no-underline"
        >
          <AppMark size={26} />
          Notables
        </Link>
        <span className="text-[13px] text-label-tertiary">Document check</span>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] grow flex-col justify-center gap-6 px-5 pt-8 pb-16">
        <AnimatePresence mode="wait">
          {check ? (
            <motion.div key="result" exit={{ opacity: 0, y: -8 }} transition={spring.snappy}>
              <SealResult check={check} onReset={reset} />
            </motion.div>
          ) : (
            <motion.div
              key="start"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring.smooth}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-[28px] font-bold tracking-tight">Is it genuine?</h1>
                <p className="max-w-[380px] text-[15px] leading-snug text-label-secondary">
                  Scan the code on an invoice, receipt or quote made with Notables to check who
                  issued it and that nothing was changed.
                </p>
              </div>

              {scanning ? (
                <QrScanner onScan={evaluate} onUnavailable={onUnavailable} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceButton icon={<ScanCodeIcon size={26} />} onClick={() => setScanning(true)}>
                    Scan code
                  </ChoiceButton>
                  <ChoiceButton
                    icon={<PhotoIcon size={26} />}
                    onClick={() => fileInput.current?.click()}
                  >
                    Choose photo
                  </ChoiceButton>
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const text = await readCodeFromImage(file).catch(() => null);
                  if (text) evaluate(text);
                  else setProblem("No code found in that picture. Try a sharper, closer photo.");
                }}
              />

              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (pasted.trim()) evaluate(pasted);
                }}
              >
                <input
                  value={pasted}
                  onChange={(event) => setPasted(event.target.value)}
                  placeholder="Or paste a verification link"
                  aria-label="Verification link"
                  className="min-w-0 grow rounded-[12px] control-field px-3.5 py-2.5 text-[14px] text-label placeholder:text-label-tertiary"
                />
                <button
                  type="submit"
                  className="rounded-[12px] bg-inverse px-4 text-[14px] font-semibold text-on-inverse disabled:opacity-40"
                  disabled={!pasted.trim()}
                >
                  Check
                </button>
              </form>

              {problem && (
                <p role="alert" className="text-center text-[14px] text-danger">
                  {problem}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-5 pb-[max(18px,env(safe-area-inset-bottom))] text-center text-[12px] text-label-tertiary">
        Checked on this device. Nothing you scan is sent anywhere.
      </footer>
    </div>
  );
}

function ChoiceButton({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-[20px] border border-separator/70 bg-elevated px-4 py-6 text-[15px] font-semibold text-label transition-[transform,background-color] hover:bg-fill/50 active:scale-[0.98]"
    >
      <span className="text-accent-text">{icon}</span>
      {children}
    </button>
  );
}
