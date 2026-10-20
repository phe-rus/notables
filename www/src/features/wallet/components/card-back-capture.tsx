import { CameraIcon, PhotoIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Sheet } from "@phe-rus/hino/sheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { currentLanguage, t } from "@/i18n/i18n";
import type { CardReading } from "../lib/card-reader";
import { cancelCardRecognition, prepareCardImage, recognizeCard } from "../lib/card-recognition";
import { withWalletAuthentication } from "../lib/wallet-auth";
import { resumedWalletStatus, walletService } from "../lib/wallet-service";
import { refreshWallet } from "../store/wallet-store";
import { CardCamera } from "./card-camera";
import { CardProcessing } from "./card-processing";

export function CardBackCapture({
  open,
  onClose,
  onRead,
}: {
  open: boolean;
  onClose: () => void;
  onRead: (reading: CardReading) => void;
}) {
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const callback = useRef(onRead);
  callback.current = onRead;
  useEffect(() => {
    generation.current++;
    alive.current = open;
    if (!open) {
      setCamera(false);
      setBusy(false);
    }
    return () => {
      alive.current = false;
      if (open) cancelCardRecognition();
    };
  }, [open]);
  const accepted = useCallback((reading: CardReading) => {
    if (alive.current) {
      setCamera(false);
      callback.current(reading);
    }
  }, []);
  const choose = async () => {
    const token = generation.current;
    setFailed(false);
    const file = await withWalletAuthentication(
      () =>
        new Promise<File | undefined>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.hidden = true;
          document.body.appendChild(input);
          input.onchange = () => {
            const selected = input.files?.[0];
            input.remove();
            resolve(selected);
          };
          input.oncancel = () => {
            input.remove();
            resolve(undefined);
          };
          input.click();
        }),
    );
    if (!file || !alive.current || token !== generation.current) return;
    setBusy(true);
    try {
      const status = await resumedWalletStatus();
      if (status.locked) await withWalletAuthentication(() => walletService.unlock("passcode"));
      await refreshWallet();
      if (token !== generation.current || !alive.current) return;
      const canvas = await prepareCardImage(file);
      if (token !== generation.current || !alive.current) {
        canvas.width = canvas.height = 0;
        return;
      }
      const reading = await recognizeCard(canvas, currentLanguage(), () => {}).result;
      if (token === generation.current) accepted(reading);
    } catch {
      if (alive.current && token === generation.current) setFailed(true);
    } finally {
      if (alive.current && token === generation.current) setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} label={t("wallet.back")}>
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-headline font-semibold">{t("wallet.back")}</h2>
        {failed && (
          <p role="alert" className="text-footnote text-danger">
            {t("wallet.captureError")}
          </p>
        )}
        {camera ? (
          <CardCamera onClose={() => setCamera(false)} onRead={accepted} />
        ) : (
          <>
            {busy ? (
              <CardProcessing />
            ) : (
              <>
                <Button size="sm" onClick={() => setCamera(true)}>
                  <CameraIcon size={18} />
                  {t("wallet.scanCard")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void choose()}>
                  <PhotoIcon size={18} />
                  {t("wallet.importImage")}
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
