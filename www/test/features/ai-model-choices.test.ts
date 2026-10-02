import { describe, expect, it } from "bun:test";
import { recommendedModels } from "../../src/features/ai/lib/model-choices";

const option = (id: string, free = false) => ({ id, name: id, free });

describe("recommended models", () => {
  it("picks the newest Claude in each tier", () => {
    const picks = recommendedModels("anthropic", [
      option("claude-opus-5"),
      option("claude-opus-5-5"),
      option("claude-sonnet-5-5"),
      option("claude-haiku-4-5"),
      option("claude-haiku-4-5-20251001"),
    ]);
    expect(picks.map((pick) => [pick.tier, pick.id])).toEqual([
      ["best", "claude-opus-5-5"],
      ["balanced", "claude-sonnet-5-5"],
      ["fast", "claude-haiku-4-5"],
    ]);
  });

  it("skips previews and picks Gemini tiers by name", () => {
    const picks = recommendedModels("gemini", [
      option("gemini-2.5-pro"),
      option("gemini-3.0-pro-preview"),
      option("gemini-2.0-flash"),
      option("gemini-2.5-flash"),
      option("gemini-2.5-flash-lite"),
    ]);
    expect(picks.map((pick) => pick.id)).toEqual([
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ]);
  });

  it("adds free models on OpenRouter", () => {
    const picks = recommendedModels("openrouter", [
      option("anthropic/claude-opus-5-5"),
      option("meta-llama/llama-4-maverick:free", true),
    ]);
    expect(picks.map((pick) => pick.tier)).toEqual(["best", "free"]);
  });
});
