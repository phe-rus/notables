import { expect, test } from "bun:test";
import { bucket } from "@/features/library/lib/date-format";
import { t } from "@/i18n/i18n";

test("previous seven days precede thirty days across a week boundary", () => {
  const now = new Date(2026, 9, 19, 12).getTime();
  expect(bucket(new Date(2026, 9, 19, 9).getTime(), now)).toBe(t("dates.today"));
  expect(bucket(new Date(2026, 9, 18, 9).getTime(), now)).toBe(t("workspace.previous7Days"));
  expect(bucket(new Date(2026, 9, 12, 0).getTime(), now)).toBe(t("workspace.previous7Days"));
  expect(bucket(new Date(2026, 9, 11, 23).getTime(), now)).toBe(t("workspace.previous30Days"));
  expect(bucket(new Date(2026, 7, 1).getTime(), now)).toBe(t("workspace.thisYear"));
  expect(bucket(new Date(2025, 7, 1).getTime(), now)).toContain("2025");
});
