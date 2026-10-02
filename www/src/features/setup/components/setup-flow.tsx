import { accents } from "@notables/tokens";
import {
  BellIcon,
  BookIcon,
  Button,
  CheckIcon,
  cn,
  InvoiceIcon,
  MicIcon,
  PenIcon,
  ScanCodeIcon,
  SegmentedControl,
  SwatchPicker,
  spring,
} from "@notables/ui";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { markAppReady } from "../../../platform/app-ready";
import { setAuthorName, useAuthorName } from "../../../platform/author-preferences";
import { type DevicePlatform, devicePlatform } from "../../../platform/device-platform";
import {
  type PermissionKind,
  type PermissionState,
  permissionState,
  requestPermission,
} from "../../../platform/permissions";
import { AiSettingsSection } from "../../ai/components/ai-settings-section";
import {
  type NoteFont,
  noteFontFamilies,
  noteFontLabels,
  noteFonts,
} from "../../library/model/note-fonts";
import { AppearanceSync } from "../../settings/components/appearance-sync";
import type { Preferences, ThemePreference } from "../../settings/model/preferences";
import { updatePreferences, usePreferences } from "../../settings/store/preferences-store";
import { LANGUAGE_KEY, markSetupDone } from "../lib/setup-state";

type StepId = "intro" | "licence" | "name" | "look" | "language" | "permissions" | "ai" | "done";
const steps: StepId[] = [
  "intro",
  "licence",
  "name",
  "look",
  "language",
  "permissions",
  "ai",
  "done",
];

const set = (change: Partial<Preferences>) => updatePreferences((p) => ({ ...p, ...change }));

/**
 * The first open on a new device: what Notables is, the licence and
 * privacy promise, a name for books and invoices, how it should look,
 * language, the device permissions that unlock features, and optional AI.
 * Everything can be changed later in Settings.
 */
export function SetupFlow() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [heading, setHeading] = useState<1 | -1>(1);
  const [agreed, setAgreed] = useState(false);
  const step = steps[index] ?? "intro";

  useEffect(() => markAppReady(), []);

  const go = (delta: 1 | -1) => {
    setHeading(delta);
    setIndex((value) => Math.min(steps.length - 1, Math.max(0, value + delta)));
  };
  const finish = () => {
    markSetupDone();
    void navigate({ to: "/", replace: true });
  };

  const canContinue = step !== "licence" || agreed;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Theme and accent choices take effect as they're picked. */}
      <AppearanceSync />
      <header className="flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))]">
        <p className="sr-only">{`Step ${index + 1} of ${steps.length}`}</p>
        <div className="flex gap-1.5" aria-hidden="true">
          {steps.map((id, position) => (
            <motion.span
              key={id}
              className="h-1.5 rounded-full bg-accent"
              animate={{
                width: position === index ? 22 : 6,
                opacity: position <= index ? 1 : 0.25,
              }}
              transition={spring.snappy}
            />
          ))}
        </div>
        {step !== "done" && step !== "licence" && (
          <button
            type="button"
            onClick={() => {
              setHeading(1);
              setIndex(steps.indexOf("done"));
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-[14px] font-medium text-label-secondary hover:bg-fill",
              index < steps.indexOf("licence") + 1 && "invisible",
            )}
          >
            Skip setup
          </button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-[540px] grow flex-col justify-center px-6 py-8">
        <AnimatePresence mode="wait" initial={false} custom={heading}>
          <motion.div
            key={step}
            custom={heading}
            variants={{
              enter: (from: number) => ({ opacity: 0, x: from * 28 }),
              center: { opacity: 1, x: 0 },
              exit: (from: number) => ({ opacity: 0, x: from * -28 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring.smooth}
            className="flex flex-col gap-6"
          >
            {step === "intro" && <IntroStep />}
            {step === "licence" && <LicenceStep agreed={agreed} onAgree={setAgreed} />}
            {step === "name" && <NameStep onSubmit={() => go(1)} />}
            {step === "look" && <LookStep />}
            {step === "language" && <LanguageStep />}
            {step === "permissions" && <PermissionsStep />}
            {step === "ai" && <AiStep />}
            {step === "done" && <DoneStep />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto flex w-full max-w-[540px] items-center justify-between gap-3 px-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <Button variant="ghost" onClick={() => go(-1)} className={cn(index === 0 && "invisible")}>
          Back
        </Button>
        {step === "done" ? (
          <Button variant="primary" size="md" onClick={finish}>
            Start writing
          </Button>
        ) : (
          <Button variant="primary" size="md" disabled={!canContinue} onClick={() => go(1)}>
            {step === "intro" ? "Get started" : step === "ai" ? "Continue without AI" : "Continue"}
          </Button>
        )}
      </footer>
    </div>
  );
}

function StepTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[30px] leading-tight font-bold tracking-tight">{title}</h1>
      {children && <p className="text-[16px] leading-snug text-label-secondary">{children}</p>}
    </div>
  );
}

function IntroStep() {
  const highlights: Array<{ icon: ReactNode; title: string; body: string }> = [
    {
      icon: <PenIcon size={20} />,
      title: "Write anything",
      body: "Notes, journals, stories, lessons and plans, typed or by hand.",
    },
    {
      icon: <BookIcon size={20} />,
      title: "Make books",
      body: "Turn writing into books, or import e-books, comics and audiobooks.",
    },
    {
      icon: <MicIcon size={20} />,
      title: "Record and transcribe",
      body: "Speak, and Notables writes it down on this device.",
    },
    {
      icon: <InvoiceIcon size={20} />,
      title: "Invoices you can prove",
      body: "Signed receipts and invoices anyone can check.",
    },
  ];
  return (
    <>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="splash-mark drop-shadow-[0_18px_40px_rgba(120,80,0,0.18)]">
          <AppMark size={84} />
        </div>
        <StepTitle title="Welcome to Notables">
          A calm place for everything you write, kept on your own devices.
        </StepTitle>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {highlights.map((item, position) => (
          <motion.li
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: 0.08 * position }}
            className="flex gap-3 rounded-[18px] border border-separator/70 bg-elevated p-4"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              {item.icon}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{item.title}</span>
              <span className="text-[13px] leading-snug text-label-secondary">{item.body}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </>
  );
}

function LicenceStep({ agreed, onAgree }: { agreed: boolean; onAgree: (value: boolean) => void }) {
  return (
    <>
      <StepTitle title="Your words stay yours">
        Before you start, here is what you can count on, and the licence Notables comes with.
      </StepTitle>
      <ul className="flex flex-col gap-2.5 text-[15px] leading-snug">
        {[
          "Everything you write is stored on this device. No account is needed.",
          "Nothing is sent anywhere unless you publish it, share it, or turn on AI with your own key.",
          "Deleted things wait in Recently Deleted for 7 days, then they're gone for good.",
        ].map((line) => (
          <li key={line} className="flex gap-2.5">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon size={12} strokeWidth={3} />
            </span>
            {line}
          </li>
        ))}
      </ul>
      <div className="max-h-[180px] overflow-y-auto rounded-[16px] bg-fill/60 p-4 text-[12px] leading-relaxed text-label-secondary">
        <p className="mb-2 font-semibold text-label">MIT License. Copyright (c) 2026 Pherus.</p>
        <p>
          Permission is hereby granted, free of charge, to any person obtaining a copy of this
          software and associated documentation files (the "Software"), to deal in the Software
          without restriction, including without limitation the rights to use, copy, modify, merge,
          publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
          to whom the Software is furnished to do so, subject to the following conditions: the above
          copyright notice and this permission notice shall be included in all copies or substantial
          portions of the Software.
        </p>
        <p className="mt-2">
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
          FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
          DEALINGS IN THE SOFTWARE.
        </p>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-elevated px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-separator)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70">
        <input
          type="checkbox"
          className="sr-only"
          checked={agreed}
          onChange={(event) => onAgree(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[22px] shrink-0 items-center justify-center rounded-[7px] transition-colors",
            agreed
              ? "bg-accent text-on-accent"
              : "shadow-[inset_0_0_0_1.5px_var(--color-label-tertiary)]",
          )}
        >
          {agreed && <CheckIcon size={14} strokeWidth={2.8} />}
        </span>
        <span className="text-[15px] font-medium">I’ve read this and agree to the licence</span>
      </label>
    </>
  );
}

function NameStep({ onSubmit }: { onSubmit: () => void }) {
  const name = useAuthorName();
  return (
    <>
      <StepTitle title="What should we call you?">
        Your name goes on books you make and pages you publish. It stays on this device.
      </StepTitle>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <input
          // biome-ignore lint/a11y/noAutofocus: the only field on this step
          autoFocus
          value={name}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          autoComplete="name"
          className="w-full rounded-[14px] control-field px-4 py-3.5 text-[19px]"
        />
      </form>
    </>
  );
}

function LookStep() {
  const preferences = usePreferences();
  return (
    <>
      <StepTitle title="Make it yours">
        Pick how Notables looks. Auto follows your device.
      </StepTitle>
      <div className="flex flex-col gap-5">
        <SegmentedControl<ThemePreference>
          label="Theme"
          value={preferences.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: "system", label: "Auto" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-label-secondary">Accent colour</span>
          <SwatchPicker
            label="Accent colour"
            value={preferences.accent}
            onChange={(accent) => set({ accent })}
            options={Object.values(accents).map((accent) => ({
              value: accent.id,
              label: accent.name,
              color: accent.light.accent,
              ink: accent.light.onAccent,
            }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-label-secondary">Writing font</span>
          <div className="grid grid-cols-2 gap-2">
            {noteFonts.map((font) => (
              <FontChoice
                key={font}
                font={font}
                selected={preferences.noteFont === font}
                onSelect={() => set({ noteFont: font })}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function FontChoice({
  font,
  selected,
  onSelect,
}: {
  font: NoteFont;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-[14px] px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70",
        selected
          ? "bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
          : "bg-fill/60 hover:bg-fill",
      )}
    >
      <input
        type="radio"
        name="setup-font"
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />
      <span className="text-[22px] leading-tight" style={{ fontFamily: noteFontFamilies[font] }}>
        Dear diary,
      </span>
      <span className="text-[12px] font-medium text-label-secondary">{noteFontLabels[font]}</span>
    </label>
  );
}

const languages = [
  { id: "en", name: "English", ready: true },
  { id: "fr", name: "Français", ready: false },
  { id: "es", name: "Español", ready: false },
  { id: "sw", name: "Kiswahili", ready: false },
  { id: "pt", name: "Português", ready: false },
  { id: "ar", name: "العربية", ready: false },
];

function LanguageStep() {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem(LANGUAGE_KEY) ?? "en";
    } catch {
      return "en";
    }
  });
  const choose = (id: string) => {
    setLanguage(id);
    try {
      localStorage.setItem(LANGUAGE_KEY, id);
    } catch {
      // The choice lasts for this session only.
    }
  };
  return (
    <>
      <StepTitle title="Language">
        Notables speaks English for now. More languages are on the way; pick yours and it will
        switch as soon as it’s ready.
      </StepTitle>
      <div className="grid grid-cols-2 gap-2">
        {languages.map((option) => (
          <label
            key={option.id}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-[14px] px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70",
              language === option.id ? "bg-accent-soft" : "bg-fill/60 hover:bg-fill",
            )}
          >
            <input
              type="radio"
              name="setup-language"
              className="sr-only"
              checked={language === option.id}
              onChange={() => choose(option.id)}
            />
            <span className="text-[15px] font-medium">{option.name}</span>
            {!option.ready && <span className="text-[11px] text-label-tertiary">Soon</span>}
          </label>
        ))}
      </div>
    </>
  );
}

/** Where people change a permission later, in their own system's words. */
function settingsPlace(device: DevicePlatform): string {
  if (!device.app) return "your browser’s site settings (the icon beside the address)";
  switch (device.os) {
    case "macos":
      return "System Settings › Privacy & Security";
    case "windows":
      return "Settings › Privacy & security";
    case "ios":
      return "Settings › Notables";
    case "android":
      return "Settings › Apps › Notables › Permissions";
    default:
      return "your system settings";
  }
}

const permissionCopy: Record<PermissionKind, { title: string; body: string; icon: ReactNode }> = {
  microphone: {
    title: "Microphone",
    body: "Record voice notes and have them written down, on this device.",
    icon: <MicIcon size={20} />,
  },
  camera: {
    title: "Camera",
    body: "Scan receipts and invoices to check they’re genuine.",
    icon: <ScanCodeIcon size={20} />,
  },
  notifications: {
    title: "Notifications",
    body: "Reminders for plans, birthdays and things you schedule.",
    icon: <BellIcon size={20} />,
  },
};

function PermissionsStep() {
  const device = devicePlatform();
  return (
    <>
      <StepTitle title="Allow what you’ll use">
        Each is optional and only asked for here. You can change them later in{" "}
        {settingsPlace(device)}.
      </StepTitle>
      <div className="flex flex-col gap-2.5">
        {(["microphone", "camera", "notifications"] as const).map((kind) => (
          <PermissionRow key={kind} kind={kind} device={device} />
        ))}
      </div>
    </>
  );
}

function PermissionRow({ kind, device }: { kind: PermissionKind; device: DevicePlatform }) {
  const [state, setState] = useState<PermissionState | "asking">("prompt");
  useEffect(() => {
    void permissionState(kind).then(setState);
  }, [kind]);
  const copy = permissionCopy[kind];
  const ask = async () => {
    setState("asking");
    setState(await requestPermission(kind));
  };
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-separator/70 bg-elevated p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
        {copy.icon}
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{copy.title}</span>
        <span className="text-[13px] leading-snug text-label-secondary">
          {state === "denied"
            ? `Turned off. To allow it, open ${settingsPlace(device)}.`
            : state === "unsupported"
              ? "Not available on this device."
              : copy.body}
        </span>
      </span>
      {state === "granted" ? (
        <span className="flex items-center gap-1 text-[14px] font-semibold text-success">
          <CheckIcon size={16} strokeWidth={2.6} />
          Allowed
        </span>
      ) : state === "prompt" || state === "asking" ? (
        <Button variant="secondary" disabled={state === "asking"} onClick={() => void ask()}>
          {state === "asking" ? "Asking…" : "Allow"}
        </Button>
      ) : null}
    </div>
  );
}

function AiStep() {
  return (
    <>
      <StepTitle title="Writing help, if you want it">
        Notables works fully without AI. If you like, bring your own key from Claude, Gemini or
        OpenRouter to summarize, improve and continue your writing.
      </StepTitle>
      <AiSettingsSection />
    </>
  );
}

function DoneStep() {
  const name = useAuthorName().trim();
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.span
        className="flex size-20 items-center justify-center rounded-full bg-success text-white shadow-lg"
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring.bouncy}
      >
        <CheckIcon size={36} strokeWidth={3} />
      </motion.span>
      <StepTitle title={name ? `You’re all set, ${name.split(" ")[0]}` : "You’re all set"}>
        Your library has a few examples to explore. Everything here can be changed in Settings.
      </StepTitle>
    </div>
  );
}
