import { expect, test } from "bun:test";
import { copyPickedReceipts } from "@/features/finances/lib/picked-receipts";

test("picker images remain readable after the temporary grant is released", async () => {
  let released = false;
  class GrantedFile extends File {
    override async arrayBuffer() {
      if (released) throw new Error("picker-grant-revoked");
      return super.arrayBuffer();
    }
  }
  const file = new GrantedFile([new Uint8Array([137, 80, 78, 71])], "synthetic.png", {
    type: "image/png",
  });
  const copies = await copyPickedReceipts([file], () => {
    released = true;
  });
  expect(released).toBe(true);
  await expect(file.arrayBuffer()).rejects.toThrow("picker-grant-revoked");
  const copy = copies[0];
  if (!copy) throw new Error("missing copied receipt");
  expect(new Uint8Array(await copy.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
});
test("failed picker reads still release the input", async () => {
  let released = false;
  class FailedFile extends File {
    override async arrayBuffer(): Promise<ArrayBuffer> {
      throw new Error("read-failed");
    }
  }
  await expect(
    copyPickedReceipts([new FailedFile(["test"], "synthetic.png", { type: "image/png" })], () => {
      released = true;
    }),
  ).rejects.toThrow("read-failed");
  expect(released).toBe(true);
});
