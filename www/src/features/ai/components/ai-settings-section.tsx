import { cn, SegmentedControl, Switch, toast } from "@notables/ui";
import { useCallback, useEffect, useState } from "react";
import { SettingsGroup, SettingsRow } from "../../settings/components/settings-controls";
import { type ModelOption, recommendedModels, tierLabels } from "../lib/model-choices";
import { AiError, listModels, streamText } from "../lib/stream-text";
import { type AiProvider, aiProviders, providerInfo } from "../model/providers";
import {
  getAiSettings,
  readAiKey,
  saveAiKey,
  updateAiSettings,
  useAiSettings,
} from "../store/ai-settings";

/**
 * Turning AI on, with the person's own key. Nothing is sent anywhere until
 * it's on, and then only to the provider they chose.
 */
export function AiSettingsSection() {
  const settings = useAiSettings();
  const provider = settings.provider;
  const info = providerInfo[provider];
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [busy, setBusy] = useState<"models" | "test" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setKey("");
    setModels([]);
    void readAiKey(provider).then((stored) => {
      if (!cancelled) setHasKey(Boolean(stored));
    });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const model = settings.models[provider];
  const setModel = (next: string) =>
    updateAiSettings((current) => ({
      ...current,
      models: { ...current.models, [provider]: next },
    }));

  const saveKey = async () => {
    await saveAiKey(provider, key);
    setHasKey(Boolean(key.trim()));
    setKey("");
    toast.success(
      key.trim() ? `${info.label} key saved on this device` : `${info.label} key removed`,
    );
  };

  // The choices load on their own once there's a key; nobody needs to know model names.
  const loadModels = useCallback(async () => {
    const stored = await readAiKey(provider);
    if (!stored) return;
    setBusy("models");
    try {
      const found = await listModels(provider, stored);
      setModels(found);
      const current = getAiSettings().models[provider];
      const picks = recommendedModels(provider, found);
      if (!found.some((option) => option.id === current) && picks[0]) {
        updateAiSettings((settings) => ({
          ...settings,
          models: { ...settings.models, [provider]: picks[0]?.id ?? current },
        }));
      }
    } catch (error) {
      toast.error("Couldn’t load models", {
        description: error instanceof AiError ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }, [provider]);

  useEffect(() => {
    if (settings.enabled && hasKey) void loadModels();
  }, [settings.enabled, hasKey, loadModels]);

  const test = async () => {
    const stored = await readAiKey(provider);
    if (!stored) return;
    setBusy("test");
    let reply = "";
    try {
      await streamText({
        provider,
        model,
        apiKey: stored,
        system: "Reply with one short word.",
        prompt: "Say ready.",
        maxTokens: 400,
        onText: (text) => {
          reply += text;
        },
      });
      toast.success(`${info.label} is ready`, {
        description: `${model} answered: ${reply.trim().slice(0, 40)}`,
      });
    } catch (error) {
      toast.error(`${info.label} didn’t answer`, {
        description: error instanceof AiError ? error.message : "Something went wrong.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="ai">
      <SettingsGroup
        title="AI writing help"
        footer={
          settings.enabled
            ? `Text you ask about goes straight from this device to ${info.label}, using your key. Notables never sees it, and nothing is sent until you ask.`
            : "Off by default. Bring your own key from Claude, Gemini or OpenRouter to summarize, improve and continue your writing."
        }
      >
        <SettingsRow label="Use AI">
          <Switch
            label="Use AI"
            checked={settings.enabled}
            onChange={(enabled) => updateAiSettings((current) => ({ ...current, enabled }))}
          />
        </SettingsRow>
        {settings.enabled && (
          <>
            <SettingsRow label="Provider" wide>
              <SegmentedControl<AiProvider>
                label="Provider"
                value={provider}
                onChange={(next) => updateAiSettings((current) => ({ ...current, provider: next }))}
                options={aiProviders.map((id) => ({ value: id, label: providerInfo[id].label }))}
              />
            </SettingsRow>
            <SettingsRow
              label="API key"
              description={hasKey ? "Saved on this device." : "Kept only on this device."}
              stacked
            >
              <div className="flex w-full flex-col gap-2">
                <form
                  className="flex w-full gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveKey();
                  }}
                >
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={key}
                    onChange={(event) => setKey(event.target.value)}
                    placeholder={hasKey ? "••••••••  (saved)" : info.keyHint}
                    aria-label={`${info.label} API key`}
                    className="min-w-0 grow rounded-[10px] control-field px-3 py-2 font-mono text-[14px]"
                  />
                  <button
                    type="submit"
                    disabled={!key.trim() && !hasKey}
                    className="rounded-[10px] bg-inverse px-3.5 text-[14px] font-semibold text-on-inverse disabled:opacity-40"
                  >
                    {key.trim() ? "Save" : hasKey ? "Remove" : "Save"}
                  </button>
                </form>
                <a
                  href={info.keyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start text-[13px] font-medium text-accent-text"
                >
                  Get a {info.label} key
                </a>
              </div>
            </SettingsRow>
            <SettingsRow label="Model" description={costNote[provider]} stacked>
              <div className="flex w-full flex-col gap-3">
                <ModelChooser
                  provider={provider}
                  models={models}
                  value={model}
                  loading={busy === "models"}
                  hasKey={hasKey}
                  onChange={setModel}
                />
                <button
                  type="button"
                  disabled={!hasKey || busy !== null}
                  onClick={() => void test()}
                  className="self-start rounded-[10px] bg-fill px-3.5 py-2 text-[14px] font-semibold disabled:opacity-40"
                >
                  {busy === "test" ? "Testing…" : "Test connection"}
                </button>
              </div>
            </SettingsRow>
          </>
        )}
      </SettingsGroup>
    </div>
  );
}

const costNote: Record<AiProvider, string> = {
  anthropic: "Paid per use, billed to your Claude account.",
  gemini: "Google’s free tier covers light use; more is billed to your Google account.",
  openrouter: "Free models cost nothing; others are paid per use from your OpenRouter credit.",
};

/** The recommended models as plain choices, with every model a click away. */
function ModelChooser({
  provider,
  models,
  value,
  loading,
  hasKey,
  onChange,
}: {
  provider: AiProvider;
  models: ModelOption[];
  value: string;
  loading: boolean;
  hasKey: boolean;
  onChange: (model: string) => void;
}) {
  const picks = recommendedModels(provider, models);
  const current = models.find((option) => option.id === value);
  const picked = picks.some((pick) => pick.id === value);

  if (!hasKey) {
    return (
      <p className="text-[14px] text-label-secondary">
        Save a key and the models it can use appear here.
      </p>
    );
  }
  if (loading && models.length === 0) {
    return <p className="text-[14px] text-label-secondary">Finding models for your key…</p>;
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">Model</legend>
        {picks.map((pick) => (
          <label
            key={pick.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70",
              value === pick.id ? "bg-accent-soft" : "bg-fill/50 hover:bg-fill",
            )}
          >
            <input
              type="radio"
              name={`model-${provider}`}
              className="sr-only"
              checked={value === pick.id}
              onChange={() => onChange(pick.id)}
            />
            <span
              aria-hidden="true"
              className={cn(
                "flex size-[18px] shrink-0 items-center justify-center rounded-full",
                value === pick.id
                  ? "bg-accent"
                  : "shadow-[inset_0_0_0_1.5px_var(--color-label-tertiary)]",
              )}
            >
              {value === pick.id && <span className="size-[7px] rounded-full bg-white" />}
            </span>
            <span className="flex min-w-0 grow flex-col">
              <span className="text-[15px] font-semibold">
                {tierLabels[pick.tier].title}
                <span className="font-normal text-label-secondary"> · {pick.name}</span>
              </span>
              <span className="text-[13px] text-label-tertiary">{tierLabels[pick.tier].note}</span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                pick.free ? "bg-success/15 text-success" : "bg-fill text-label-secondary",
              )}
            >
              {pick.free ? "Free" : "Paid"}
            </span>
          </label>
        ))}
      </fieldset>
      {models.length > 0 && (
        <details className="group" open={!picked && models.length > 0 ? true : undefined}>
          <summary className="cursor-pointer list-none text-[13px] font-medium text-accent-text">
            {picked ? "Other model…" : `Using ${current?.name ?? value}`}
          </summary>
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Any model"
            className="mt-2 w-full rounded-[10px] control-field px-3 py-2 text-[14px]"
          >
            {models.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.free ? " (free)" : ""}
              </option>
            ))}
          </select>
        </details>
      )}
    </div>
  );
}
