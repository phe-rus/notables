import type {
  ReceiptCaptureObserver,
  ReceiptCaptureOperation,
  ReceiptCaptureServices,
  ReceiptFrame,
} from "@/features/finances/model/types";

/** One receipt acquisition owns its picker copy, reader and decoded frame. */
export function createReceiptCapture<Frame extends ReceiptFrame>(
  services: ReceiptCaptureServices<Frame>,
  observer: ReceiptCaptureObserver,
) {
  let current: ReceiptCaptureOperation<Frame> | null = null;
  const release = (operation: ReceiptCaptureOperation<Frame>) => {
    const reader = operation.reader;
    operation.reader = undefined;
    reader?.stop();
    if (operation.frame) operation.frame.width = operation.frame.height = 0;
    operation.frame = undefined;
  };
  const cancel = () => {
    const previous = current;
    current = null;
    if (previous) release(previous);
    return previous !== null;
  };
  const run = async (acquire: () => Promise<File[]>, stage: "copy" | "read") => {
    cancel();
    const operation: ReceiptCaptureOperation<Frame> = {};
    current = operation;
    observer.onStart();
    try {
      const images = await acquire();
      if (current !== operation || !images.length) return;
      stage = "read";
      observer.onFiles(images);
      const tools = await services.load();
      if (current !== operation) return;
      const reader = tools.createReader();
      operation.reader = reader;
      const texts: string[] = [];
      for (const image of images.slice(0, 10)) {
        const frame = await tools.prepare(image);
        try {
          if (current !== operation) return;
          operation.frame = frame;
          const reading = await reader.read(frame);
          if (current !== operation) return;
          texts.push(reading.text);
        } finally {
          frame.width = frame.height = 0;
          operation.frame = undefined;
        }
      }
      if (current === operation) observer.onRead(texts.join("\n"));
    } catch {
      if (current === operation) observer.onFailure(stage);
    } finally {
      release(operation);
      if (current === operation) {
        current = null;
        observer.onFinish();
      }
    }
  };
  return {
    scan: (images: File[]) => run(async () => images, "read"),
    pick: (files: readonly File[], release: () => void) =>
      run(() => services.copy(files, release), "copy"),
    cancel,
  };
}
