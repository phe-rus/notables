import { SegmentedControl, Switch, toast } from "@notables/ui";
import { useEffect, useState } from "react";
import { SettingsGroup, SettingsRow } from "../../settings/components/settings-controls";
import { AiError, listModels, streamText } from "../lib/stream-text";
import { type AiProvider, aiProviders, providerInfo } from "../model/providers";
import { readAiKey, saveAiKey, updateAiSettings, useAiSettings } from "../store/ai-settings";

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
  const [models, setModels] = useState<string[]>([]);
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

  const loadModels = async () => {
    const stored = await readAiKey(provider);
    if (!stored) return;
    setBusy("models");
    try {
      const found = await listModels(provider, stored);
      setModels(found);
      if (found.length && !found.includes(model)) setModel(found[0] as string);
    } catch (error) {
      toast.error("Couldn’t load models", {
        description: error instanceof AiError ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

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
            <SettingsRow label="Model" stacked>
              <div className="flex w-full gap-2">
                {models.length > 0 ? (
                  <select
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    aria-label="Model"
                    className="min-w-0 grow rounded-[10px] control-field px-3 py-2 text-[14px]"
                  >
                    {[...new Set([model, ...models])].map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={model}
                    onChange={(event) => setModel(event.target.value.trim())}
                    aria-label="Model"
                    spellCheck={false}
                    className="min-w-0 grow rounded-[10px] control-field px-3 py-2 font-mono text-[14px]"
                  />
                )}
                <button
                  type="button"
                  disabled={!hasKey || busy !== null}
                  onClick={() => void loadModels()}
                  className="rounded-[10px] bg-fill px-3 text-[14px] font-semibold disabled:opacity-40"
                >
                  {busy === "models" ? "Loading…" : "Choose…"}
                </button>
                <button
                  type="button"
                  disabled={!hasKey || busy !== null}
                  onClick={() => void test()}
                  className="rounded-[10px] bg-fill px-3 text-[14px] font-semibold disabled:opacity-40"
                >
                  {busy === "test" ? "Testing…" : "Test"}
                </button>
              </div>
            </SettingsRow>
          </>
        )}
      </SettingsGroup>
    </div>
  );
}
