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
import { currentLanguage, setLanguageChoice, t, useLanguageChoice } from "../../../i18n/i18n";
import { languages } from "../../../i18n/languages";
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
import { markSetupDone } from "../lib/setup-state";

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
const STEP_KEY = "notables:setup-step";

function savedStep(): number {
  try {
    const step = Number(sessionStorage.getItem(STEP_KEY));
    return Number.isInteger(step) && step > 0 && step < steps.length ? step : 0;
  } catch {
    return 0;
  }
}

export function SetupFlow() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(savedStep);
  const [heading, setHeading] = useState<1 | -1>(1);
  const [agreed, setAgreed] = useState(false);
  const step = steps[index] ?? "intro";

  useEffect(() => markAppReady(), []);

  // Changing language redraws the app; carry on from the same step.
  useEffect(() => {
    try {
      sessionStorage.setItem(STEP_KEY, String(index));
    } catch {
      // Starts over after a language change.
    }
  }, [index]);

  const go = (delta: 1 | -1) => {
    setHeading(delta);
    setIndex((value) => Math.min(steps.length - 1, Math.max(0, value + delta)));
  };
  const finish = () => {
    markSetupDone();
    try {
      sessionStorage.removeItem(STEP_KEY);
    } catch {
      // Nothing to clear.
    }
    void navigate({ to: "/", replace: true });
  };

  const canContinue = step !== "licence" || agreed;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Theme and accent choices take effect as they're picked. */}
      <AppearanceSync />
      <header className="flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))]">
        <p className="sr-only">{t("setup.stepOf", { step: index + 1, total: steps.length })}</p>
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
            {t("setup.skip")}
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
          {t("common.back")}
        </Button>
        {step === "done" ? (
          <Button variant="primary" size="md" onClick={finish}>
            {t("setup.startWriting")}
          </Button>
        ) : (
          <Button variant="primary" size="md" disabled={!canContinue} onClick={() => go(1)}>
            {step === "intro"
              ? t("setup.getStarted")
              : step === "ai"
                ? t("setup.continueWithoutAi")
                : t("common.continue")}
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
      title: t("setup.writeAnything"),
      body: t("setup.writeAnythingBody"),
    },
    {
      icon: <BookIcon size={20} />,
      title: t("setup.makeBooks"),
      body: t("setup.makeBooksBody"),
    },
    {
      icon: <MicIcon size={20} />,
      title: t("setup.record"),
      body: t("setup.recordBody"),
    },
    {
      icon: <InvoiceIcon size={20} />,
      title: t("setup.invoices"),
      body: t("setup.invoicesBody"),
    },
  ];
  return (
    <>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="splash-mark drop-shadow-[0_18px_40px_rgba(120,80,0,0.18)]">
          <AppMark size={84} />
        </div>
        <StepTitle title={t("setup.welcome")}>{t("setup.welcomeBody")}</StepTitle>
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
      <StepTitle title={t("setup.yours")}>{t("setup.yoursBody")}</StepTitle>
      <ul className="flex flex-col gap-2.5 text-[15px] leading-snug">
        {[t("setup.promiseDevice"), t("setup.promiseNothingSent"), t("setup.promiseBin")].map(
          (line) => (
            <li key={line} className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
                <CheckIcon size={12} strokeWidth={3} />
              </span>
              {line}
            </li>
          ),
        )}
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
        <span className="text-[15px] font-medium">{t("setup.agree")}</span>
      </label>
    </>
  );
}

function NameStep({ onSubmit }: { onSubmit: () => void }) {
  const name = useAuthorName();
  return (
    <>
      <StepTitle title={t("setup.nameTitle")}>{t("setup.nameBody")}</StepTitle>
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
          placeholder={t("setup.namePlaceholder")}
          aria-label={t("setup.namePlaceholder")}
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
      <StepTitle title={t("setup.lookTitle")}>{t("setup.lookBody")}</StepTitle>
      <div className="flex flex-col gap-5">
        <SegmentedControl<ThemePreference>
          label={t("settings.theme")}
          value={preferences.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: "system", label: t("settings.themeAuto") },
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
          ]}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-label-secondary">
            {t("setup.accentColour")}
          </span>
          <SwatchPicker
            label={t("setup.accentColour")}
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
          <span className="text-[13px] font-medium text-label-secondary">
            {t("setup.writingFont")}
          </span>
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

function LanguageStep() {
  const choice = useLanguageChoice();
  const current = currentLanguage();
  return (
    <>
      <StepTitle title={t("setup.languageTitle")}>{t("setup.languageBody")}</StepTitle>
      <div className="grid grid-cols-2 gap-2">
        {languages.map((option) => {
          const selected = choice === "system" ? current === option.id : choice === option.id;
          return (
            <label
              key={option.id}
              lang={option.id}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-[14px] px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70",
                selected ? "bg-accent-soft" : "bg-fill/60 hover:bg-fill",
              )}
            >
              <input
                type="radio"
                name="setup-language"
                className="sr-only"
                checked={selected}
                onChange={() => setLanguageChoice(option.id)}
              />
              <span className="text-[15px] font-medium">{option.name}</span>
              {selected && <CheckIcon size={16} strokeWidth={2.6} className="text-accent-text" />}
            </label>
          );
        })}
      </div>
    </>
  );
}

/** Where people change a permission later, in their own system's words. */
function settingsPlace(device: DevicePlatform): string {
  if (!device.app) return t("setup.placeBrowser");
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
      return t("setup.placeSystem");
  }
}

const permissionCopy = (kind: PermissionKind): { title: string; body: string; icon: ReactNode } =>
  ({
    microphone: {
      title: t("setup.microphone"),
      body: t("setup.microphoneBody"),
      icon: <MicIcon size={20} />,
    },
    camera: {
      title: t("setup.camera"),
      body: t("setup.cameraBody"),
      icon: <ScanCodeIcon size={20} />,
    },
    notifications: {
      title: t("setup.notifications"),
      body: t("setup.notificationsBody"),
      icon: <BellIcon size={20} />,
    },
  })[kind];

function PermissionsStep() {
  const device = devicePlatform();
  return (
    <>
      <StepTitle title={t("setup.permissionsTitle")}>
        {t("setup.permissionsBody", { place: settingsPlace(device) })}
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
  const copy = permissionCopy(kind);
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
            ? t("setup.permissionDenied", { place: settingsPlace(device) })
            : state === "unsupported"
              ? t("common.notAvailable")
              : copy.body}
        </span>
      </span>
      {state === "granted" ? (
        <span className="flex items-center gap-1 text-[14px] font-semibold text-success">
          <CheckIcon size={16} strokeWidth={2.6} />
          {t("common.allowed")}
        </span>
      ) : state === "prompt" || state === "asking" ? (
        <Button variant="secondary" disabled={state === "asking"} onClick={() => void ask()}>
          {state === "asking" ? t("common.asking") : t("common.allow")}
        </Button>
      ) : null}
    </div>
  );
}

function AiStep() {
  return (
    <>
      <StepTitle title={t("setup.aiTitle")}>{t("setup.aiBody")}</StepTitle>
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
      <StepTitle
        title={
          name ? t("setup.allSetName", { name: name.split(" ")[0] ?? name }) : t("setup.allSet")
        }
      >
        {t("setup.allSetBody")}
      </StepTitle>
    </div>
  );
}
