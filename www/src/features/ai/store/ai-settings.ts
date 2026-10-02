import { useSyncExternalStore } from "react";
import { isTauri } from "../../../platform/runtime";
import { nativeStorage } from "../../../platform/storage/backends/native/native-commands";
import { type AiProvider, aiProviders, providerInfo } from "../model/providers";

/**
 * AI is off until the person turns it on and brings a key. Settings live
 * on this device; keys are kept apart from them, in the app's own storage
 * on desktop and mobile, or this browser's storage on the web.
 */
export interface AiSettings {
  enabled: boolean;
  provider: AiProvider;
  /** The chosen model for each provider. */
  models: Record<AiProvider, string>;
}

const SETTINGS_KEY = "notables:ai";
const keyName = (provider: AiProvider) => `notables:ai-key:${provider}`;

const defaults: AiSettings = {
  enabled: false,
  provider: "anthropic",
  models: {
    anthropic: providerInfo.anthropic.defaultModel,
    gemini: providerInfo.gemini.defaultModel,
    openrouter: providerInfo.openrouter.defaultModel,
  },
};

function read(): AiSettings {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) ?? "null",
    ) as Partial<AiSettings> | null;
    if (!stored) return defaults;
    return {
      enabled: stored.enabled === true,
      provider: aiProviders.includes(stored.provider as AiProvider)
        ? (stored.provider as AiProvider)
        : defaults.provider,
      models: { ...defaults.models, ...(stored.models ?? {}) },
    };
  } catch {
    return defaults;
  }
}

let current: AiSettings | null = null;
const listeners = new Set<() => void>();

export function getAiSettings(): AiSettings {
  current ??= typeof localStorage === "undefined" ? defaults : read();
  return current;
}

export function updateAiSettings(change: (settings: AiSettings) => AiSettings) {
  current = change(getAiSettings());
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // Settings last for this session only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAiSettings(): AiSettings {
  return useSyncExternalStore(subscribe, getAiSettings, () => defaults);
}

export async function readAiKey(provider: AiProvider): Promise<string | null> {
  if (isTauri()) return (await nativeStorage.meta(keyName(provider))) || null;
  try {
    return localStorage.getItem(keyName(provider));
  } catch {
    return null;
  }
}

export async function saveAiKey(provider: AiProvider, key: string): Promise<void> {
  const value = key.trim();
  if (isTauri()) {
    await nativeStorage.setMeta(keyName(provider), value);
  } else if (value) {
    localStorage.setItem(keyName(provider), value);
  } else {
    localStorage.removeItem(keyName(provider));
  }
  for (const listener of listeners) listener();
}
