import { expect, it } from "bun:test";
import { closestCardPalette } from "@/features/wallet/lib/card-colors";

it("ignores paper, glare and grayscale instead of guessing a color", () => {
  expect(
    closestCardPalette([255, 255, 255, 255, 15, 15, 15, 255, 150, 150, 150, 255]),
  ).toBeUndefined();
});
it("keeps an ocean card blue despite a white border and dark lettering", () => {
  expect(closestCardPalette([255, 255, 255, 255, 15, 15, 15, 255, 60, 130, 200, 255])).toBe(
    "ocean",
  );
});
