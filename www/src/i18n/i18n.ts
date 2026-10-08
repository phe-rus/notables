import { useSyncExternalStore } from "react";
import { isLanguageId, type LanguageId, languages } from "./languages";
import { ar } from "./messages/ar";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { pt } from "./messages/pt";
import { sw } from "./messages/sw";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

const catalogs: Record<LanguageId, DeepPartial<Messages>> = { en, fr, es, pt, sw, ar };

/** "system" follows the device's language when Notables speaks it. */
export type LanguageChoice = LanguageId | "system";

export const LANGUAGE_KEY = "notables:language";

type Plural = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** Dotted paths to every message: "settings.theme", "calendar.kind.plan"… */
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends { other: string }
      ? `${Prefix}${K}`
      : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Paths<Messages>;

function readChoice(): LanguageChoice {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return isLanguageId(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function systemLanguage(): LanguageId {
  if (typeof navigator === "undefined") return "en";
  for (const tag of navigator.languages ?? [navigator.language]) {
    if (typeof tag !== "string") continue;
    const base = tag.toLowerCase().split("-")[0];
    if (isLanguageId(base)) return base;
  }
  return "en";
}

let choice: LanguageChoice = typeof localStorage === "undefined" ? "system" : readChoice();
const listeners = new Set<() => void>();

export function languageChoice(): LanguageChoice {
  return choice;
}

/** The language in use right now. */
export function currentLanguage(): LanguageId {
  return choice === "system" ? systemLanguage() : choice;
}

/**
 * The locale for dates and numbers: the device's own (with its region)
 * when following the system, otherwise the chosen language.
 */
export function locale(): string | undefined {
  return choice === "system" ? undefined : choice;
}

export function setLanguageChoice(next: LanguageChoice) {
  choice = next;
  try {
    if (next === "system") localStorage.removeItem(LANGUAGE_KEY);
    else localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    // Applies for this session.
  }
  applyDocumentLanguage();
  for (const listener of listeners) listener();
}

/** Sets the page's language and direction, for screen readers, fonts and RTL layout. */
export function applyDocumentLanguage() {
  if (typeof document === "undefined") return;
  const id = currentLanguage();
  document.documentElement.lang = id;
  document.documentElement.dir = languages.find((language) => language.id === id)?.dir ?? "ltr";
}

function lookup(catalog: unknown, key: string): unknown {
  let node = catalog;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

const pluralRules = new Map<string, Intl.PluralRules>();

/**
 * A message in the current language, falling back to English, with
 * `{name}` placeholders filled from `params` and plurals chosen by `count`.
 */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const language = currentLanguage();
  let message = lookup(catalogs[language], key) ?? lookup(en, key);
  if (message && typeof message === "object") {
    const plural = message as Plural;
    const count = Number(params.count ?? 0);
    let rules = pluralRules.get(language);
    if (!rules) {
      rules = new Intl.PluralRules(language);
      pluralRules.set(language, rules);
    }
    message = plural[rules.select(count)] ?? plural.other;
  }
  if (typeof message !== "string") return key;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Re-renders when the language changes. */
export function useLanguage(): LanguageId {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    currentLanguage,
    () => "en" as LanguageId,
  );
}

export function useLanguageChoice(): LanguageChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    languageChoice,
    () => "system" as LanguageChoice,
  );
}
