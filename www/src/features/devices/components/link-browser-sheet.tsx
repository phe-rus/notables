import {
  bytesToHex,
  isPairingCode,
  normalizeCode,
  PhonePairing,
  pairingRoom,
  RoomSocket,
} from "@notables/sync";
import { Button, CloseIcon, IconButton, Sheet, toast } from "@phe-rus/hino";
import { useEffect, useEffectEvent, useState } from "react";
import { TextInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import { roomEndpoint } from "../../../platform/session/room-endpoint";
import { thisDeviceId, thisDeviceName } from "../../../platform/session/this-device";
import { spaceRoot, startSpace } from "../../../platform/space/space-identity";
import { QrScanner } from "../../invoices/verify/qr-scanner";
import { addBrowserSession } from "../lib/browser-sessions";
import { readLinkUrl } from "../lib/link-url";
import { servesBrowsers } from "../lib/serves-browsers";
import { PairingWords } from "./link-browser-screen";

export interface LinkTarget {
  code: string;
  /** The browser from its QR code; null for a typed code. */
  browserId: string | null;
}

type Stage =
  | { name: "scan"; typing: boolean; error?: string }
  | { name: "connecting" }
  | { name: "saving" }
  | { name: "words"; words: string[] };

/**
 * Approves a browser or another device of the space from this one (spec
 * 0005, AC-3, AC-4): scan its QR code or type its code, check the four words
 * match, and approve. A device receives the space's secret, sealed with the
 * pairing key; a browser receives only a session of its own, and only from
 * a phone (AC-23).
 */
export function LinkBrowserSheet({
  open,
  initial,
  onClose,
  title = t("devices.linkBrowser"),
  kind = "browser",
}: {
  open: boolean;
  initial: LinkTarget | null;
  onClose: () => void;
  title?: string;
  kind?: "browser" | "device";
}) {
  return (
    <Sheet open={open} onClose={onClose} label={title} className="max-w-[440px]">
      {open && <LinkBrowserContent initial={initial} onClose={onClose} title={title} kind={kind} />}
    </Sheet>
  );
}

function LinkBrowserContent({
  initial,
  onClose,
  title,
  kind,
}: {
  initial: LinkTarget | null;
  onClose: () => void;
  title: string;
  kind: "browser" | "device";
}) {
  const [target, setTarget] = useState<LinkTarget | null>(initial);
  const [stage, setStage] = useState<Stage>(
    initial ? { name: "connecting" } : { name: "scan", typing: false },
  );
  const [typed, setTyped] = useState("");
  const [pairing, setPairing] = useState<PhonePairing | null>(null);
  const close = useEffectEvent(onClose);

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
      if (flow.waitingKind === "device") toast.success(t("devices.deviceLinked"));
      else {
        addBrowserSession(browserId, sessionKey);
        toast.success(t("devices.linked"));
      }
      close();
    });
    flow.on("failed", () => {
      setTarget(null);
      setStage({ name: "scan", typing: true, error: t("devices.peerJoinFailed") });
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
  }, [target]);

  useEffect(() => {
    if (stage.name !== "saving") return;
    const timeout = setTimeout(() => {
      setTarget(null);
      setStage({ name: "scan", typing: true, error: t("devices.finishTimeout") });
    }, 20_000);
    return () => clearTimeout(timeout);
  }, [stage.name]);

  const begin = (next: LinkTarget) => {
    setStage({ name: "connecting" });
    setTarget(next);
  };

  const onScan = (text: string) => {
    const link = readLinkUrl(text);
    if (link) begin(link);
  };

  const approve = async () => {
    if (!pairing) return;
    if (pairing.waitingKind === "browser") {
      if (servesBrowsers()) pairing.approve();
      else {
        // Browsers link to phones only; a computer uses the desktop app.
        pairing.reject();
        setTarget(null);
        setStage({ name: "scan", typing: true, error: t("devices.browsersOnPhones") });
      }
      return;
    }
    await startSpace();
    const root = spaceRoot();
    if (!root) {
      toast.error(t("devices.identityUnavailable"));
      return;
    }
    setStage({ name: "saving" });
    pairing.approve({ root: bytesToHex(root) });
  };

  const submitTyped = () => {
    if (!isPairingCode(typed)) return;
    begin({ code: normalizeCode(typed), browserId: null });
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-title3 font-bold tracking-tight">{title}</h2>
          {stage.name === "scan" && (
            <p className="text-footnote leading-snug text-label-secondary">
              {t(kind === "device" ? "devices.scanDeviceHint" : "devices.scanHint")}
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
                {t(kind === "device" ? "devices.deviceCodeLabel" : "devices.codeLabel")}
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
        {(stage.name === "connecting" || stage.name === "saving") && (
          <p role="status" className="py-6 text-center text-callout text-label-secondary">
            {t(stage.name === "saving" ? "devices.finishing" : "devices.connecting")}
          </p>
        )}
        {stage.name === "words" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-callout">
              {pairing?.waitingKind === "device"
                ? t("devices.checkWordsDevice")
                : t("devices.checkWords")}
            </p>
            <PairingWords words={stage.words} />
            <div className="flex w-full flex-col gap-2 pt-2">
              <Button onClick={() => void approve()}>{t("devices.wordsMatch")}</Button>
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
