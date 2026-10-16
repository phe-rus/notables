import {
  BrowserPairing,
  hexToBytes,
  newPairingCode,
  pairingRoom,
  RoomSocket,
} from "@notables/sync";
import { Button, CloseIcon, IconButton, Sheet, toast } from "@phe-rus/hino";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { roomEndpoint } from "../../../platform/session/room-endpoint";
import { thisDeviceId } from "../../../platform/session/this-device";
import { adoptSpace } from "../../../platform/space/space-identity";
import { rejoinSpaceSync } from "../../../platform/space/space-sync";
import { SealCode } from "../../invoices/components/seal-code";
import { eraseUntouchedExamples } from "../../onboarding/lib/examples";
import { linkUrl } from "../lib/link-url";
import { PairingWords } from "./link-browser-screen";

/** A code lasts this long before a new one replaces it (AC-3). */
const CODE_LIFETIME = 5 * 60 * 1000;

type Stage = { name: "waiting"; message?: string } | { name: "words"; words: string[] };

/**
 * Links this device to the person's other devices (spec 0005, AC-3 to
 * AC-5): it shows a code, a device they already use approves it after
 * both show the same four words, and this device joins that space. What
 * it already holds joins too, merged like any edit.
 */
export function LinkDeviceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label={t("devices.joinTitle")} className="max-w-[440px]">
      {open && <LinkDeviceContent onClose={onClose} />}
    </Sheet>
  );
}

function LinkDeviceContent({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(newPairingCode);
  const [stage, setStage] = useState<Stage>({ name: "waiting" });

  useEffect(() => {
    const me = thisDeviceId();
    const room = new RoomSocket(roomEndpoint(), pairingRoom(code), me);
    const pairing = new BrowserPairing(code, (to, body) => room.send(to, body), "device");
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
    pairing.on("approved", ({ phoneName, extra }) => {
      if (typeof extra.root !== "string") return;
      const root = hexToBytes(extra.root);
      // One set of examples per space: this device's untouched ones make way.
      void eraseUntouchedExamples()
        .then(() => adoptSpace(root))
        .then(() => {
          rejoinSpaceSync();
          toast.success(t("devices.joined", { name: phoneName }));
          onClose();
        })
        .catch(() => renew(t("devices.joinFailed")));
    });
    room.start();
    const expire = setTimeout(() => renew(t("devices.webNewCode")), CODE_LIFETIME);
    return () => {
      clearTimeout(expire);
      room.stop();
    };
  }, [code, onClose]);

  const shown = `${code.slice(0, 4)} ${code.slice(4)}`;

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-title3 font-bold tracking-tight">{t("devices.joinTitle")}</h2>
          {stage.name === "waiting" && (
            <p className="text-footnote leading-snug text-label-secondary">
              {t("devices.joinHint")}
            </p>
          )}
        </div>
        <IconButton size="icon-sm" variant="ghost" label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      <div className="flex flex-col items-center gap-4 px-6 pt-3 pb-6">
        {stage.name === "waiting" && (
          <>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <SealCode value={linkUrl(code, thisDeviceId())} size={200} />
            </div>
            <p className="font-mono text-title2 font-semibold tracking-[0.2em]">
              <span aria-hidden="true">{shown}</span>
              {/* Read letter by letter, so a screen reader doesn't say it as a word. */}
              <span className="sr-only">{code.split("").join(" ")}</span>
            </p>
            {stage.message && (
              <p role="status" className="text-center text-footnote text-danger">
                {stage.message}
              </p>
            )}
            <p className="text-center text-footnote text-label-secondary">
              {t("devices.joinMerges")}
            </p>
          </>
        )}
        {stage.name === "words" && (
          <>
            <p className="text-center text-callout">{t("devices.joinWords")}</p>
            <PairingWords words={stage.words} />
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
