import { extractSeal, hiddenMarkFor, type SealCheck, verifySeal } from "@notables/core";
import { Link } from "@tanstack/react-router";
import { PhotoIcon, ScanCodeIcon, spring } from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { sealFromPdf } from "../export/invoice-pdf";
import { checkByNumber } from "./check-by-number";
import { HiddenMarkCheck, type MarkSource } from "./hidden-mark-check";
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
  const [seal, setSeal] = useState<string | null>(null);
  const [source, setSource] = useState<MarkSource>({ kind: "none" });
  const [matchedNumber, setMatchedNumber] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const evaluate = useCallback((text: string, from: MarkSource = { kind: "none" }) => {
    const found = extractSeal(text);
    setScanning(false);
    if (!found) {
      setProblem("That isn’t a Notables verification code.");
      return;
    }
    setProblem(null);
    setSeal(found);
    setSource(from);
    setCheck(verifySeal(found));
  }, []);
  const onCameraScan = useCallback(
    (text: string) => evaluate(text, { kind: "camera" }),
    [evaluate],
  );

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
    setSeal(null);
    setMatchedNumber(null);
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
          className="flex items-center gap-2 text-subheadline font-semibold text-label no-underline"
        >
          <AppMark size={26} />
          Notables
        </Link>
        <span className="text-footnote text-label-tertiary">Document check</span>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] grow flex-col justify-center gap-6 px-5 pt-8 pb-16">
        <AnimatePresence mode="wait">
          {check ? (
            <motion.div key="result" exit={{ opacity: 0, y: -8 }} transition={spring.snappy}>
              <SealResult
                check={check}
                onReset={reset}
                extra={
                  <>
                    {matchedNumber && (
                      <p className="rounded-2xl bg-success/10 px-4 py-2.5 text-center text-[14px] font-medium">
                        The number and check code match {matchedNumber} as issued from this device.
                      </p>
                    )}
                    {check.valid && seal && (
                      <HiddenMarkCheck expected={hiddenMarkFor(seal)} source={source} />
                    )}
                  </>
                }
              />
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
                <h1 className="text-title font-bold tracking-tight">Is it genuine?</h1>
                <p className="max-w-[380px] text-subheadline leading-snug text-label-secondary">
                  Scan the code on an invoice, receipt or quote made with Notables to check who
                  issued it and that nothing was changed.
                </p>
              </div>

              {scanning ? (
                <QrScanner onScan={onCameraScan} onUnavailable={onUnavailable} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceButton icon={<ScanCodeIcon size={26} />} onClick={() => setScanning(true)}>
                    Scan code
                  </ChoiceButton>
                  <ChoiceButton
                    icon={<PhotoIcon size={26} />}
                    onClick={() => fileInput.current?.click()}
                  >
                    Photo or PDF
                  </ChoiceButton>
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  // A Notables PDF carries its seal inside; a photo or screenshot shows the code.
                  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                    const seal = sealFromPdf(new Uint8Array(await file.arrayBuffer()));
                    if (seal) evaluate(seal);
                    else setProblem("This PDF wasn’t made with Notables, or its seal was removed.");
                    return;
                  }
                  const text = await readCodeFromImage(file).catch(() => null);
                  if (text) evaluate(text, { kind: "photo", file });
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
                  className="min-w-0 grow rounded-xl control-field px-3.5 py-2.5 text-[14px] text-label placeholder:text-label-tertiary"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-inverse px-4 text-[14px] font-semibold text-on-inverse disabled:opacity-40"
                  disabled={!pasted.trim()}
                >
                  Check
                </button>
              </form>

              <NumberCheckForm
                onMatch={(number, found) => {
                  evaluate(found);
                  setMatchedNumber(number);
                }}
                onProblem={setProblem}
              />

              {problem && (
                <p role="alert" className="text-center text-[14px] text-danger">
                  {problem}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-5 pb-[max(18px,env(safe-area-inset-bottom))] text-center text-caption text-label-tertiary">
        Checked on this device. Nothing you scan is sent anywhere.
      </footer>
    </div>
  );
}

/**
 * For the issuer at a desk: type the number and check code printed on a
 * paper copy to confirm it against what this device issued.
 */
function NumberCheckForm({
  onMatch,
  onProblem,
}: {
  onMatch: (number: string, seal: string) => void;
  onProblem: (problem: string | null) => void;
}) {
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <details className="group rounded-4xl border border-separator/70 bg-elevated px-4 py-3 open:pb-4">
      <summary className="cursor-pointer list-none text-[14px] font-semibold text-label marker:hidden">
        Check by number instead
        <span className="block text-footnote font-normal text-label-secondary">
          For documents issued from this device: type the number and check code on the paper.
        </span>
      </summary>
      <form
        className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 max-sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!number.trim() || !code.trim()) return;
          setBusy(true);
          onProblem(null);
          try {
            const result = await checkByNumber(number, code);
            if (result.status === "match") onMatch(number.trim(), result.seal);
            else if (result.status === "code-mismatch")
              onProblem(
                `The check code doesn’t match ${number.trim()} as issued. The paper may have been changed, or the code was mistyped.`,
              );
            else
              onProblem(
                `${number.trim()} wasn’t issued from this device. Scan its code with a phone to check it anywhere.`,
              );
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          placeholder="Number, e.g. INV-0042"
          aria-label="Document number"
          className="min-w-0 rounded-xl control-field px-3 py-2.5 text-[14px]"
        />
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Check code"
          aria-label="Check code"
          autoCapitalize="characters"
          className="min-w-0 rounded-xl control-field px-3 py-2.5 font-mono text-[14px] uppercase"
        />
        <button
          type="submit"
          disabled={busy || !number.trim() || !code.trim()}
          className="rounded-xl bg-inverse px-4 py-2.5 text-[14px] font-semibold text-on-inverse disabled:opacity-40 max-sm:col-span-2"
        >
          {busy ? "Checking…" : "Check"}
        </button>
      </form>
    </details>
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
      className="flex flex-col items-center gap-2 rounded-4xl border border-separator/70 bg-elevated px-4 py-6 text-subheadline font-semibold text-label transition-[transform,background-color] hover:bg-fill/50 active:scale-[0.98]"
    >
      <span className="text-accent-text">{icon}</span>
      {children}
    </button>
  );
}
