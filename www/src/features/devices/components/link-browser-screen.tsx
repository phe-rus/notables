import {
  BrowserPairing,
  isPairingCode,
  newPairingCode,
  pairingRoom,
  RoomSocket,
} from "@notables/sync";
import { spring } from "@phe-rus/hino";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { AppMark } from "@/components/brand/app-mark";
import { SealCode } from "@/features/invoices/components/seal-code";
import { t } from "@/i18n/i18n";
import { markAppReady } from "@/platform/app-ready";
import { saveBrowserSession } from "@/platform/session/browser-session-store";
import { roomEndpoint } from "@/platform/session/room-endpoint";
import { linkUrl } from "../lib/link-url";

/** A code lasts this long before a new one replaces it (AC-3). */
const CODE_LIFETIME = 5 * 60 * 1000;

type Stage =
  | { name: "waiting"; message?: string }
  | { name: "words"; words: string[] }
  | { name: "linked"; phone: string };

/**
 * The web's front door (spec 0005, AC-22): a QR code and a code for a
 * phone to approve. Nothing is stored until the phone says yes, and then
 * only the session key.
 */
export function LinkBrowserScreen() {
  const [code, setCode] = useState(newPairingCode);
  const [browserId] = useState(() => crypto.randomUUID());
  const [stage, setStage] = useState<Stage>({ name: "waiting" });

  useEffect(() => markAppReady(), []);

  useEffect(() => {
    const room = new RoomSocket(roomEndpoint(), pairingRoom(code), browserId);
    const pairing = new BrowserPairing(code, (to, body) => room.send(to, body));
    const renew = (message?: string) => {
      setStage({ name: "waiting", message });
      setCode(newPairingCode());
    };
    room.on("message", ({ from, body }) => pairing.receive(from, body));
    pairing.on("words", (words) => setStage({ name: "words", words }));
    pairing.on("wrong", (count) =>
      setStage({ name: "waiting", message: t("devices.webWrong", { count }) }),
    );
    pairing.on("rejected", () => renew(t("devices.webRejected")));
    pairing.on("exhausted", () => renew(t("devices.webNewCode")));
    pairing.on("approved", ({ phoneId, phoneName, sessionKey }) => {
      saveBrowserSession({
        phoneId,
        phoneName,
        browserId,
        key: sessionKey,
        pairedAt: Date.now(),
      });
      setStage({ name: "linked", phone: phoneName });
      // Start over as the phone's window: storage now goes through the phone.
      setTimeout(() => window.location.assign("/"), 900);
    });
    room.start();
    const expire = setTimeout(() => renew(t("devices.webNewCode")), CODE_LIFETIME);
    return () => {
      clearTimeout(expire);
      room.stop();
    };
  }, [code, browserId]);

  const shown = isPairingCode(code) ? `${code.slice(0, 4)} ${code.slice(4)}` : code;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-paper px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <AppMark size={56} />
        <h1 className="text-title leading-tight font-bold tracking-tight">
          {t("devices.webTitle")}
        </h1>
      </div>
      <AnimatePresence mode="wait">
        {stage.name === "waiting" && (
          <motion.div
            key={`waiting-${code}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.smooth}
            className="flex w-full max-w-[760px] flex-col items-center gap-8 md:flex-row md:items-start md:justify-center"
          >
            <ol className="flex max-w-[340px] list-decimal flex-col gap-3 ps-5 text-callout leading-snug">
              <li>{t("devices.webStep1")}</li>
              <li>{t("devices.webStep2")}</li>
              <li>{t("devices.webStep3")}</li>
              <p className="-ms-5 mt-2 text-footnote text-label-secondary">
                {t("devices.sameWifi")}
              </p>
              <p className="-ms-5 text-footnote text-label-secondary">
                {t("devices.nothingStored")}
              </p>
            </ol>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <SealCode value={linkUrl(code, browserId)} size={220} />
              </div>
              <p className="font-mono text-title2 font-semibold tracking-[0.2em]">
                <span aria-hidden="true">{shown}</span>
                {/* Read letter by letter, so a screen reader doesn't say it as a word. */}
                <span className="sr-only">{code.split("").join(" ")}</span>
              </p>
              {stage.message && (
                <p role="status" className="max-w-[260px] text-center text-footnote text-danger">
                  {stage.message}
                </p>
              )}
            </div>
          </motion.div>
        )}
        {stage.name === "words" && (
          <motion.div
            key="words"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.smooth}
            className="flex flex-col items-center gap-4 text-center"
          >
            <p className="text-callout text-label-secondary">{t("devices.webWords")}</p>
            <PairingWords words={stage.words} />
          </motion.div>
        )}
        {stage.name === "linked" && (
          <motion.p
            key="linked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            className="text-title3 font-semibold"
          >
            {t("devices.webLinked", { name: stage.phone })}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The four words both screens show. */
export function PairingWords({ words }: { words: string[] }) {
  return (
    <ol className="grid grid-cols-2 gap-2">
      {words.map((word, index) => (
        <li
          // A word can repeat; its place is its identity.
          key={index}
          className="rounded-2xl bg-fill/70 px-5 py-3 text-title3 font-semibold"
        >
          {word}
        </li>
      ))}
    </ol>
  );
}
