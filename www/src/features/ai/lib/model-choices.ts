import type { AiProvider } from "../model/providers";

/** A model as people see it: a plain name, how it compares, and whether it's free. */
export interface ModelOption {
  id: string;
  name: string;
  free: boolean;
}

export type ModelTier = "best" | "balanced" | "fast";

export interface ModelPick extends ModelOption {
  tier: ModelTier | "free";
}

export const tierLabels: Record<ModelPick["tier"], { title: string; note: string }> = {
  best: { title: "Best", note: "Most capable, a little slower" },
  balanced: { title: "Balanced", note: "Quick and very capable" },
  fast: { title: "Fast", note: "Quickest, for light tasks" },
  free: { title: "Free", note: "No cost, with usage limits" },
};

/** Patterns for each tier, most preferred first, per provider. */
const tiers: Record<AiProvider, Record<ModelTier, RegExp[]>> = {
  anthropic: {
    best: [/^claude-opus-\d/],
    balanced: [/^claude-sonnet-\d/],
    fast: [/^claude-haiku-\d/],
  },
  gemini: {
    best: [/^gemini-[\d.]+-pro(-latest)?$/],
    balanced: [/^gemini-[\d.]+-flash(-latest)?$/],
    fast: [/^gemini-[\d.]+-flash-lite(-latest)?$/],
  },
  openrouter: {
    best: [/^anthropic\/claude-opus-\d/, /^google\/gemini-[\d.]+-pro$/],
    balanced: [/^anthropic\/claude-sonnet-\d/, /^google\/gemini-[\d.]+-flash$/],
    fast: [/^google\/gemini-[\d.]+-flash-lite$/, /^anthropic\/claude-haiku-\d/],
  },
};

/** "2.5" beats "2.0", "opus-5-5" beats "opus-5": newest version first. */
function versionOf(id: string): number[] {
  return (id.match(/\d+/g) ?? []).map(Number);
}

function newer(a: string, b: string): number {
  const x = versionOf(a);
  const y = versionOf(b);
  for (let index = 0; index < Math.max(x.length, y.length); index++) {
    const difference = (y[index] ?? -1) - (x[index] ?? -1);
    if (difference) return difference;
  }
  return a.length - b.length;
}

/**
 * A handful of sensible choices from everything a key can use: the newest
 * model in each tier, and on OpenRouter a few free ones. Previews and
 * dated snapshots are skipped so the list stays stable.
 */
export function recommendedModels(provider: AiProvider, options: ModelOption[]): ModelPick[] {
  const usable = options.filter(
    (option) => !/preview|exp|experimental|\d{8}|tts|image|embedding|vision-only/i.test(option.id),
  );
  const picks: ModelPick[] = [];
  for (const tier of ["best", "balanced", "fast"] as const) {
    for (const pattern of tiers[provider][tier]) {
      const match = usable
        .filter((option) => pattern.test(option.id) && !option.id.endsWith(":free"))
        .sort((a, b) => newer(a.id, b.id))[0];
      if (match) {
        picks.push({ ...match, tier });
        break;
      }
    }
  }
  if (provider === "openrouter") {
    const free = usable.filter((option) => option.free).slice(0, 4);
    picks.push(...free.map((option) => ({ ...option, tier: "free" as const })));
  }
  return picks;
}
