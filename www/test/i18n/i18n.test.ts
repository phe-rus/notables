import { afterEach, describe, expect, it } from "bun:test";
import { currentLanguage, setLanguageChoice, t } from "../../src/i18n/i18n";
import { languages } from "../../src/i18n/languages";
import { ar } from "../../src/i18n/messages/ar";
import { en } from "../../src/i18n/messages/en";
import { es } from "../../src/i18n/messages/es";
import { fr } from "../../src/i18n/messages/fr";
import { pt } from "../../src/i18n/messages/pt";
import { sw } from "../../src/i18n/messages/sw";

function keys(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  const entries = Object.entries(node as Record<string, unknown>);
  // A plural message is one key, whatever categories a language uses.
  if (entries.some(([key]) => key === "other")) return [prefix];
  return entries.flatMap(([key, value]) => keys(value, prefix ? `${prefix}.${key}` : key));
}

describe("i18n", () => {
  afterEach(() => setLanguageChoice("en"));

  it("has every message in every language", () => {
    const english = keys(en).sort();
    for (const [id, catalog] of Object.entries({ fr, es, pt, sw, ar })) {
      expect({ id, keys: keys(catalog).sort() }).toEqual({ id, keys: english });
    }
    expect(languages.map((language) => language.id)).toEqual(["en", "fr", "es", "pt", "sw", "ar"]);
  });

  it("fills placeholders and picks plural forms", () => {
    setLanguageChoice("en");
    expect(t("books.chapterCount", { count: 1 })).toBe("1 chapter");
    expect(t("books.chapterCount", { count: 3 })).toBe("3 chapters");
    expect(t("calendar.whenAt", { date: "Today", time: "9:00" })).toBe("Today at 9:00");
  });

  it("switches language, including Arabic plurals", () => {
    setLanguageChoice("fr");
    expect(currentLanguage()).toBe("fr");
    expect(t("settings.title")).toBe("Réglages");
    setLanguageChoice("ar");
    expect(t("books.chapterCount", { count: 2 })).toBe("فصلان");
    expect(t("books.chapterCount", { count: 5 })).toBe("5 فصول");
    expect(t("books.chapterCount", { count: 11 })).toBe("11 فصلًا");
  });
});
