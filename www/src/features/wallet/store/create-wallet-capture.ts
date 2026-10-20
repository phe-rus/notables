import { currentLanguage } from "@/i18n/i18n";
import { cancelWalletNfc, readWalletNfc } from "../lib/card-nfc";
import {
  cancelCardRecognition,
  prepareCardImage,
  recognizeCard,
  suggestCardFields,
} from "../lib/card-recognition";
import { withWalletSystemPrompt } from "../lib/wallet-auth";
import { resumedWalletStatus } from "../lib/wallet-service";
import type { CardReading, WalletCaptureContext } from "../model/types";

export function createWalletCapture(context: WalletCaptureContext) {
  function cancelWalletCapture() {
    context.invalidate();
    cancelCardRecognition();
    cancelWalletNfc();
    context.update({
      captureProgress: null,
      captureReview: null,
      captureError: false,
      captureMethod: null,
      captureNfcUnsupported: false,
    });
  }

  function correctWalletCapture() {
    context.update({
      captureReview: {
        suggestions: {
          kind: "other",
          meter: "",
          account: "",
          displayName: "",
          holder: "",
          number: "",
          expiry: "",
          issuer: "",
          puk: "",
        },
        confidence: 0,
        text: "",
      },
    });
  }

  /** The camera session owns cancellation; only accept results into an accessible wallet. */
  function reviewWalletReading(review: CardReading) {
    const state = context.state();
    if (!state.status?.initialized || state.status.locked || state.view !== "add") return;
    context.update({ captureReview: review, captureProgress: null, captureError: false });
  }

  async function recognizeWalletCanvas(canvas: HTMLCanvasElement) {
    const token = context.epoch();
    if (!context.state().status?.initialized || context.state().status?.locked) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    context.update({
      view: "add",
      captureProgress: 0,
      captureError: false,
      captureReview: null,
      captureMethod: "image",
      captureNfcUnsupported: false,
    });
    const job = recognizeCard(canvas, currentLanguage(), (value) => {
      if (token === context.epoch()) context.update({ captureProgress: value });
    });
    try {
      const review = await job.result;
      if (token === context.epoch()) context.update({ captureReview: review });
    } catch {
      if (token === context.epoch()) context.update({ captureError: true });
    } finally {
      if (token === context.epoch()) context.update({ captureProgress: null });
    }
  }

  async function importWalletImage(file: File) {
    // A native file chooser may background the WebView. Only begin processing
    // its new selection after a fresh native status has reestablished access.
    const token = context.epoch();
    try {
      const status = await resumedWalletStatus();
      if (token !== context.epoch()) return;
      await context.applyStatus(status, token);
    } catch (error) {
      if (token === context.epoch()) context.fail(error);
      return;
    }
    if (token !== context.epoch()) return;
    if (
      !context.state().status?.initialized ||
      context.state().status?.locked ||
      document.visibilityState !== "visible"
    )
      return;
    context.update({ view: "add", captureProgress: 0, captureError: false });
    try {
      const canvas = await prepareCardImage(file);
      if (token !== context.epoch()) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      await recognizeWalletCanvas(canvas);
    } catch {
      if (token === context.epoch()) context.update({ captureProgress: null, captureError: true });
    }
  }

  async function scanWalletNfc() {
    const token = context.epoch();
    if (!context.state().status?.initialized || context.state().status?.locked) return;
    context.update({
      captureProgress: 0,
      captureError: false,
      captureReview: null,
      captureMethod: "nfc",
      captureNfcUnsupported: false,
    });
    try {
      const text = await withWalletSystemPrompt(async () => {
        try {
          return await readWalletNfc();
        } finally {
          if (token === context.epoch())
            await context.applyStatus(await resumedWalletStatus(), token);
        }
      });
      if (token === context.epoch())
        context.update({
          captureReview: {
            text,
            confidence: 100,
            source: "nfc",
            suggestions: suggestCardFields(text),
          },
        });
    } catch (error) {
      if (token === context.epoch())
        context.update({
          captureError: true,
          captureNfcUnsupported: error instanceof Error && error.message === "no-readable-details",
        });
    } finally {
      if (token === context.epoch()) context.update({ captureProgress: null });
    }
  }
  return {
    cancel: cancelWalletCapture,
    correct: correctWalletCapture,
    review: reviewWalletReading,
    recognize: recognizeWalletCanvas,
    importImage: importWalletImage,
    scanNfc: scanWalletNfc,
  };
}
