import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "../model/providers";

/**
 * Sends one writing request to the chosen provider and streams the reply.
 * Requests go directly from this device to the provider with the
 * person's own key; Notables has no server in between.
 */
export interface TextRequest {
  provider: AiProvider;
  model: string;
  apiKey: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  signal?: AbortSignal;
  onText: (text: string) => void;
}

/** A failure to show people as is. */
export class AiError extends Error {}

export async function streamText(request: TextRequest): Promise<void> {
  if (request.provider === "anthropic") return streamClaude(request);
  if (request.provider === "gemini") return streamGemini(request);
  return streamOpenRouter(request);
}

/* ——— Claude ——— */

// Current models that take an effort level, and those with refusal fallbacks.
const takesEffort = (model: string) => /^claude-(opus|sonnet|fable|mythos)-(5|4-[6-9])/.test(model);
const FALLBACK_MODELS = [
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
];

async function streamClaude({
  model,
  apiKey,
  system,
  prompt,
  maxTokens,
  signal,
  onText,
}: TextRequest) {
  // The key is the person's own, typed into this app; it never passes through a server of ours.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  try {
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: maxTokens ?? 16000,
        system,
        messages: [{ role: "user", content: prompt }],
        // Writing help should feel quick; low effort keeps replies prompt.
        ...(takesEffort(model) ? { output_config: { effort: "low" as const } } : {}),
        // If a safety check declines, another model answers instead of nothing.
        ...(FALLBACK_MODELS.includes(model)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { signal },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        onText(event.delta.text);
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      throw new AiError("Claude declined this request.");
    }
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AiError("Claude didn’t accept this API key. Check it in Settings.");
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      throw new AiError("This key can’t use that model. Choose another in Settings.");
    }
    if (error instanceof Anthropic.NotFoundError) {
      throw new AiError(`Claude doesn’t know the model “${model}”. Choose another in Settings.`);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiError("Too many requests for now. Try again in a moment.");
    }
    if (error instanceof Anthropic.APIUserAbortError) throw error;
    if (error instanceof Anthropic.APIConnectionError) {
      throw new AiError("Couldn’t reach Claude. Check your connection.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiError(`Claude couldn’t answer (${error.status ?? "error"}).`);
    }
    throw error;
  }
}

/* ——— Server-sent events, for Gemini and OpenRouter ——— */

async function* serverEvents(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end = buffer.indexOf("\n");
    while (end !== -1) {
      const line = buffer.slice(0, end).replace(/\r$/, "");
      buffer = buffer.slice(end + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
      end = buffer.indexOf("\n");
    }
  }
}

async function failure(response: Response, provider: string): Promise<AiError> {
  if (response.status === 401 || response.status === 403) {
    return new AiError(`${provider} didn’t accept this API key. Check it in Settings.`);
  }
  if (response.status === 429)
    return new AiError("Too many requests for now. Try again in a moment.");
  if (response.status === 404)
    return new AiError(`${provider} doesn’t know that model. Choose another in Settings.`);
  const body = await response.text().catch(() => "");
  const message = body.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
  return new AiError(
    message ? `${provider}: ${message}` : `${provider} couldn’t answer (${response.status}).`,
  );
}

/* ——— Gemini ——— */

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

async function streamGemini({
  model,
  apiKey,
  system,
  prompt,
  maxTokens,
  signal,
  onText,
}: TextRequest) {
  const response = await fetch(
    `${GEMINI}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens ?? 8192 },
      }),
    },
  ).catch(() => {
    throw new AiError("Couldn’t reach Gemini. Check your connection.");
  });
  if (!response.ok) throw await failure(response, "Gemini");
  for await (const data of serverEvents(response)) {
    const chunk = JSON.parse(data) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      promptFeedback?: { blockReason?: string };
    };
    if (chunk.promptFeedback?.blockReason) throw new AiError("Gemini declined this request.");
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if (part.text) onText(part.text);
    }
  }
}

/* ——— OpenRouter ——— */

async function streamOpenRouter({
  model,
  apiKey,
  system,
  prompt,
  maxTokens,
  signal,
  onText,
}: TextRequest) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      // OpenRouter asks apps to identify themselves.
      "x-title": "Notables",
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: maxTokens ?? 8192,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  }).catch(() => {
    throw new AiError("Couldn’t reach OpenRouter. Check your connection.");
  });
  if (!response.ok) throw await failure(response, "OpenRouter");
  for await (const data of serverEvents(response)) {
    if (data === "[DONE]") break;
    const chunk = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>;
      error?: { message?: string };
    };
    if (chunk.error) throw new AiError(`OpenRouter: ${chunk.error.message ?? "error"}`);
    const text = chunk.choices?.[0]?.delta?.content;
    if (text) onText(text);
  }
}

/* ——— Models ——— */

/** The models a key can use, newest first where the provider says. */
export async function listModels(provider: AiProvider, apiKey: string): Promise<string[]> {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const ids: string[] = [];
    for await (const model of client.models.list()) ids.push(model.id);
    return ids;
  }
  if (provider === "gemini") {
    const response = await fetch(`${GEMINI}/models?pageSize=200`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!response.ok) throw await failure(response, "Gemini");
    const body = (await response.json()) as {
      models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    };
    return (body.models ?? [])
      .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => model.name.replace(/^models\//, ""));
  }
  const response = await fetch("https://openrouter.ai/api/v1/models");
  if (!response.ok) throw await failure(response, "OpenRouter");
  const body = (await response.json()) as { data?: Array<{ id: string }> };
  return (body.data ?? []).map((model) => model.id);
}
