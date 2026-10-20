import { expect, test } from "bun:test";
import { createReceiptCapture } from "@/features/finances/lib/create-receipt-capture";
import { copyPickedReceipts } from "@/features/finances/lib/picked-receipts";
import type { ReceiptCaptureObserver, ReceiptReaderTools } from "@/features/finances/model/types";

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error("not-ready");
  };
  let reject: (error: Error) => void = () => {
    throw new Error("not-ready");
  };
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function observer() {
  const reads: string[] = [];
  const failures: string[] = [];
  let finishes = 0;
  const callbacks: ReceiptCaptureObserver = {
    onStart: () => {},
    onFiles: () => {},
    onRead: (text) => reads.push(text),
    onFailure: (stage) => failures.push(stage),
    onFinish: () => {
      finishes++;
    },
  };
  return { callbacks, reads, failures, finishes: () => finishes };
}
const file = new File(["synthetic receipt"], "receipt.png", { type: "image/png" });

test("cancellation during engine loading cannot create a reader or publish a review", async () => {
  const loaded = deferred<ReceiptReaderTools<{ width: number; height: number }>>();
  const started = deferred<void>();
  const view = observer();
  let readers = 0;
  const capture = createReceiptCapture(
    {
      copy: copyPickedReceipts,
      load: () => {
        started.resolve();
        return loaded.promise;
      },
    },
    view.callbacks,
  );
  const pending = capture.scan([file]);
  await started.promise;
  expect(capture.cancel()).toBe(true);
  loaded.resolve({
    prepare: async () => ({ width: 1, height: 1 }),
    createReader: () => {
      readers++;
      return { read: async () => ({ text: "old" }), stop: () => {} };
    },
  });
  await pending;
  expect(readers).toBe(0);
  expect(view.reads).toEqual([]);
  expect(view.failures).toEqual([]);
  expect(view.finishes()).toBe(0);
});

test("a decoded frame arriving after cancellation is cleared without recognition", async () => {
  const prepared = deferred<{ width: number; height: number }>();
  const started = deferred<void>();
  const view = observer();
  let stops = 0;
  let reads = 0;
  const capture = createReceiptCapture(
    {
      copy: copyPickedReceipts,
      load: async () => ({
        prepare: () => {
          started.resolve();
          return prepared.promise;
        },
        createReader: () => ({
          read: async () => {
            reads++;
            return { text: "old" };
          },
          stop: () => {
            stops++;
          },
        }),
      }),
    },
    view.callbacks,
  );
  const pending = capture.scan([file]);
  await started.promise;
  capture.cancel();
  capture.cancel();
  const frame = { width: 40, height: 60 };
  prepared.resolve(frame);
  await pending;
  expect(frame).toEqual({ width: 0, height: 0 });
  expect(reads).toBe(0);
  expect(stops).toBe(1);
  expect(view.reads).toEqual([]);
});

for (const outcome of ["result", "failure"]) {
  test(`an older OCR ${outcome} cannot finish or replace a newer scan`, async () => {
    const first = deferred<{ text: string }>();
    const second = deferred<{ text: string }>();
    const started = [deferred<void>(), deferred<void>()];
    const frames = [
      { width: 10, height: 20 },
      { width: 30, height: 40 },
    ];
    const stops = [0, 0];
    const view = observer();
    let index = 0;
    const capture = createReceiptCapture(
      {
        copy: copyPickedReceipts,
        load: async () => {
          const own = index++;
          return {
            prepare: async () => frames[own] ?? { width: 1, height: 1 },
            createReader: () => ({
              read: () => {
                started[own]?.resolve();
                return own === 0 ? first.promise : second.promise;
              },
              stop: () => {
                stops[own] = (stops[own] ?? 0) + 1;
              },
            }),
          };
        },
      },
      view.callbacks,
    );
    const old = capture.scan([file]);
    await started[0]?.promise;
    const next = capture.scan([file]);
    await started[1]?.promise;
    if (outcome === "failure") first.reject(new Error("late-native-error"));
    else first.resolve({ text: "Old receipt" });
    await old;
    expect(view.failures).toEqual([]);
    expect(view.finishes()).toBe(0);
    second.resolve({ text: "New receipt USD 20.00" });
    await next;
    expect(view.reads).toEqual(["New receipt USD 20.00"]);
    expect(view.finishes()).toBe(1);
    expect(stops).toEqual([1, 1]);
    expect(frames).toEqual([
      { width: 0, height: 0 },
      { width: 0, height: 0 },
    ]);
  });
}

for (const outcome of ["result", "failure"]) {
  test(`cancelling a pending picker copy releases its grant and ignores its late ${outcome}`, async () => {
    const bytes = deferred<ArrayBuffer>();
    const copying = deferred<void>();
    class PendingFile extends File {
      override arrayBuffer() {
        copying.resolve();
        return bytes.promise;
      }
    }
    const view = observer();
    let released = 0;
    let loads = 0;
    const capture = createReceiptCapture(
      {
        copy: copyPickedReceipts,
        load: async () => {
          loads++;
          return {
            prepare: async () => ({ width: 1, height: 1 }),
            createReader: () => ({ read: async () => ({ text: "New receipt" }), stop: () => {} }),
          };
        },
      },
      view.callbacks,
    );
    const pending = capture.pick(
      [new PendingFile(["test"], "pending.png", { type: "image/png" })],
      () => {
        released++;
      },
    );
    await copying.promise;
    await capture.scan([file]);
    if (outcome === "failure") bytes.reject(new Error("grant-ended"));
    else bytes.resolve(new ArrayBuffer(4));
    await pending;
    expect(released).toBe(1);
    expect(loads).toBe(1);
    expect(view.reads).toEqual(["New receipt"]);
    expect(view.failures).toEqual([]);
    expect(view.finishes()).toBe(1);
  });
}

test("current OCR errors release the reader and frame and finish once", async () => {
  const frame = { width: 40, height: 50 };
  let stops = 0;
  const view = observer();
  const capture = createReceiptCapture(
    {
      copy: copyPickedReceipts,
      load: async () => ({
        prepare: async () => frame,
        createReader: () => ({
          read: async () => {
            throw new Error("read-failed");
          },
          stop: () => {
            stops++;
          },
        }),
      }),
    },
    view.callbacks,
  );
  await capture.scan([file]);
  expect(stops).toBe(1);
  expect(frame).toEqual({ width: 0, height: 0 });
  expect(view.failures).toEqual(["read"]);
  expect(view.finishes()).toBe(1);
  expect(view.reads).toEqual([]);
});

test("current picker errors are identified separately and an empty selection never loads OCR", async () => {
  const view = observer();
  let loads = 0;
  const capture = createReceiptCapture(
    {
      copy: async () => {
        throw new Error("copy-failed");
      },
      load: async () => {
        loads++;
        throw new Error("unexpected-reader");
      },
    },
    view.callbacks,
  );
  await capture.pick([file], () => {});
  await capture.scan([]);
  expect(loads).toBe(0);
  expect(view.failures).toEqual(["copy"]);
  expect(view.finishes()).toBe(2);
});

test("receipt text stays in page order and one reader handles at most ten images", async () => {
  const view = observer();
  const frames: Array<{ width: number; height: number }> = [];
  let reads = 0;
  let stops = 0;
  const capture = createReceiptCapture(
    {
      copy: copyPickedReceipts,
      load: async () => ({
        prepare: async () => {
          const frame = { width: 40, height: 50 };
          frames.push(frame);
          return frame;
        },
        createReader: () => ({
          read: async () => ({ text: String(++reads) }),
          stop: () => {
            stops++;
          },
        }),
      }),
    },
    view.callbacks,
  );
  await capture.scan(Array.from({ length: 11 }, () => file));
  expect(view.reads).toEqual(["1\n2\n3\n4\n5\n6\n7\n8\n9\n10"]);
  expect(stops).toBe(1);
  expect(frames.every((frame) => !frame.width && !frame.height)).toBe(true);
});
