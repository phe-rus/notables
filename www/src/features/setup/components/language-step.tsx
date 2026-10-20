import { CheckIcon, cn } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { currentLanguage, setLanguageChoice, t, useLanguageChoice } from "@/i18n/i18n";
import { languages } from "@/i18n/languages";
import { StepTitle } from "./step-title";

export function LanguageStep() {
  const choice = useLanguageChoice();
  const current = currentLanguage();
  return (
    <>
      <StepTitle title={t("setup.languageTitle")}>{t("setup.languageBody")}</StepTitle>
      <div className="grid grid-cols-2 gap-2">
        {languages.map((option) => {
          const selected = choice === "system" ? current === option.id : choice === option.id;
          return (
            <Button
              key={option.id}
              variant="ghost"
              size="sm"
              aria-pressed={selected}
              onClick={() => setLanguageChoice(option.id)}
              lang={option.id}
              className={cn(
                "h-auto min-h-11 items-center justify-between rounded-xl px-3 py-2.5",
                selected ? "bg-accent-soft" : "bg-fill/60 hover:bg-fill",
              )}
            >
              <span className="text-subheadline font-medium">{option.name}</span>
              {selected && <CheckIcon size={16} strokeWidth={2.6} className="text-accent-text" />}
            </Button>
          );
        })}
      </div>
    </>
  );
}
