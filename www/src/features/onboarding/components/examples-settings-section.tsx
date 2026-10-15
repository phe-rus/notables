import { Button, confirmDialog, LabeledContent, Section, toast } from "@phe-rus/hino";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { removeExamples, useExampleCount } from "../lib/examples";
import { seedExamplesAgain } from "../lib/seed-welcome-library";

/** Start fresh at any time, or bring the examples back after starting fresh. */
export function ExamplesSettingsSection() {
  const count = useExampleCount();
  const [adding, setAdding] = useState(false);

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: t("examples.removeTitle"),
      message: t("examples.removeBody"),
      confirmLabel: t("examples.remove"),
      destructive: true,
    });
    if (confirmed) removeExamples();
  };
  const add = async () => {
    setAdding(true);
    try {
      await seedExamplesAgain();
      toast.success(t("examples.added"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Section footer={t("examples.footer")}>
      <LabeledContent label={t("examples.title")}>
        {count > 0 && !adding ? (
          <Button variant="secondary" onClick={() => void remove()}>
            {t("examples.remove")}
          </Button>
        ) : (
          <Button variant="secondary" disabled={adding} onClick={() => void add()}>
            {t("examples.add")}
          </Button>
        )}
      </LabeledContent>
    </Section>
  );
}
