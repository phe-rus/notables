/** Where AI requests go: straight from this device, with the person's own key. */
export type AiProvider = "anthropic" | "gemini" | "openrouter";

export const aiProviders: AiProvider[] = ["anthropic", "gemini", "openrouter"];

export interface ProviderInfo {
  label: string;
  /** Where people get a key. */
  keyUrl: string;
  keyHint: string;
  /** Used until the person picks one from the provider's list. */
  defaultModel: string;
}

export const providerInfo: Record<AiProvider, ProviderInfo> = {
  anthropic: {
    label: "Claude",
    keyUrl: "https://platform.claude.com/settings/keys",
    keyHint: "sk-ant-…",
    defaultModel: "claude-opus-5-5",
  },
  gemini: {
    label: "Gemini",
    keyUrl: "https://aistudio.google.com/apikey",
    keyHint: "AIza…",
    defaultModel: "gemini-2.5-flash",
  },
  openrouter: {
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-…",
    defaultModel: "anthropic/claude-opus-5-5",
  },
};
