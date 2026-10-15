import {
  isPairingCode,
  normalizeCode,
  PhonePairing,
  pairingRoom,
  RoomSocket,
} from "@notables/sync";
import { Button, CloseIcon, IconButton, Sheet, toast } from "@phe-rus/hino";
import { useEffect, useState } from "react";
import { TextInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import { roomEndpoint } from "../../../platform/session/room-endpoint";
import { thisDeviceId, thisDeviceName } from "../../../platform/session/this-device";
import { QrScanner } from "../../invoices/verify/qr-scanner";
import { addBrowserSession } from "../lib/browser-sessions";
import { readLinkUrl } from "../lib/link-url";
import { PairingWords } from "./link-browser-screen";

export interface LinkTarget {
  code: string;
  /** The browser from its QR code; null for a typed code. */
  browserId: string | null;
}

type Stage =
  | { name: "scan"; typing: boolean; error?: string }
  | { name: "connecting" }
  | { name: "words"; words: string[] };

/**
 * Approves a browser from the phone (spec 0005, AC-3, AC-4): scan its QR
 * code or type its code, check the four words match, and approve.
 */
export function LinkBrowserSheet({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: LinkTarget | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={t("devices.linkBrowser")} className="max-w-[440px]">
      {open && <LinkBrowserContent initial={initial} onClose={onClose} />}
    </Sheet>
  );
}

function LinkBrowserContent({
  initial,
  onClose,
}: {
  initial: LinkTarget | null;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<LinkTarget | null>(initial);
  const [stage, setStage] = useState<Stage>(
    initial ? { name: "connecting" } : { name: "scan", typing: false },
  );
  const [typed, setTyped] = useState("");
  const [pairing, setPairing] = useState<PhonePairing | null>(null);

  useEffect(() => {
    if (!target) return;
    const room = new RoomSocket(roomEndpoint(), pairingRoom(target.code), thisDeviceId());
    const flow = new PhonePairing(target.code, (to, body) => room.send(to, body), thisDeviceName());
    room.on("message", ({ from, body }) => flow.receive(from, body));
    room.on("open", () => flow.begin(target.browserId, (body) => room.send(null, body)));
    flow.on("words", (words) => setStage({ name: "words", words }));
    flow.on("wrong", () => {
      setTarget(null);
      setStage({ name: "scan", typing: true, error: t("devices.wrongCode") });
    });
    flow.on("approved", ({ browserId, sessionKey }) => {
      addBrowserSession(browserId, sessionKey);
      toast.success(t("devices.linked"));
      onClose();
    });
    setPairing(flow);
    room.start();
    // No browser answered: the code is old, or the browser is closed.
    const quiet = setTimeout(() => {
      setTarget(null);
      setStage({ name: "scan", typing: true, error: t("devices.noBrowser") });
    }, 20_000);
    flow.on("words", () => clearTimeout(quiet));
    return () => {
      clearTimeout(quiet);
      setTimeout(() => room.stop(), 500);
    };
  }, [target, onClose]);

  const begin = (next: LinkTarget) => {
    setStage({ name: "connecting" });
    setTarget(next);
  };

  const onScan = (text: string) => {
    const link = readLinkUrl(text);
    if (link) begin(link);
  };

  const submitTyped = () => {
    if (!isPairingCode(typed)) return;
    begin({ code: normalizeCode(typed), browserId: null });
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-title3 font-bold tracking-tight">{t("devices.linkBrowser")}</h2>
          {stage.name === "scan" && (
            <p className="text-footnote leading-snug text-label-secondary">
              {t("devices.scanHint")}
            </p>
          )}
        </div>
        <IconButton size="icon-sm" variant="ghost" label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      <div className="flex flex-col gap-4 px-6 pt-3 pb-6">
        {stage.name === "scan" && !stage.typing && (
          <>
            <div className="overflow-hidden rounded-3xl bg-black">
              <QrScanner
                onScan={onScan}
                onUnavailable={() => setStage({ name: "scan", typing: true })}
              />
            </div>
            <Button variant="secondary" onClick={() => setStage({ name: "scan", typing: true })}>
              {t("devices.typeInstead")}
            </Button>
          </>
        )}
        {stage.name === "scan" && stage.typing && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitTyped();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="link-browser-code"
                className="text-footnote font-medium text-label-secondary"
              >
                {t("devices.codeLabel")}
              </label>
              <TextInput
                id="link-browser-code"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={12}
                placeholder="K7QM 4TXA"
                className="font-mono text-title3 tracking-[0.2em]"
              />
            </div>
            {stage.error && (
              <p role="alert" className="text-footnote text-danger">
                {stage.error}
              </p>
            )}
            <Button type="submit" disabled={!isPairingCode(typed)}>
              {t("common.continue")}
            </Button>
          </form>
        )}
        {stage.name === "connecting" && (
          <p role="status" className="py-6 text-center text-callout text-label-secondary">
            {t("devices.connecting")}
          </p>
        )}
        {stage.name === "words" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-callout">{t("devices.checkWords")}</p>
            <PairingWords words={stage.words} />
            <div className="flex w-full flex-col gap-2 pt-2">
              <Button onClick={() => pairing?.approve()}>{t("devices.wordsMatch")}</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  pairing?.reject();
                  onClose();
                }}
              >
                {t("devices.wordsDiffer")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
