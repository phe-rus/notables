import { TextField } from "@phe-rus/hino/text-field";
import { t } from "@/i18n/i18n";
import { setAuthorName, useAuthorName } from "@/platform/author-preferences";
import type { NameStepProps } from "../model/types";
import { StepTitle } from "./step-title";

export function NameStep({ onSubmit }: NameStepProps) {
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
        <TextField
          autoFocus
          value={name}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder={t("setup.namePlaceholder")}
          label={t("setup.namePlaceholder")}
          autoComplete="name"
          className="text-body"
        />
      </form>
    </>
  );
}
