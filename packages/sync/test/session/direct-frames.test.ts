import { expect, test } from "bun:test";
import { DirectFrames, directPieces } from "../../src/session/direct-frames";

test("large direct frames assemble in order while ordinary frames keep their format", () => {
  const data = new Uint8Array(300000).map((_, index) => index % 251);
  const receiver = new DirectFrames();
  let result: Uint8Array | null = null;
  for (const piece of directPieces(data, 42)) {
    expect(piece.length).toBeLessThan(65536);
    result = receiver.receive(piece);
  }
  expect(result).toEqual(data);
  const small = new Uint8Array([1, 2, 3]);
  expect(receiver.receive(small)).toEqual(small);
});
test("incomplete and reordered chunks never produce a partial document", () => {
  const pieces = [...directPieces(new Uint8Array(100000), 2)];
  const receiver = new DirectFrames();
  expect(receiver.receive(pieces[1] as Uint8Array)).toBeNull();
  expect(receiver.receive(pieces[0] as Uint8Array)).toBeNull();
  expect(receiver.receive(pieces[2] as Uint8Array)).toBeNull();
});
