import { defaultToolbarLabels, type ToolbarLabels } from "@notables/pluraliti";
import { t } from "@/i18n/i18n";

export function editorLabels(): ToolbarLabels {
  return Object.fromEntries(
    (Object.keys(defaultToolbarLabels) as (keyof ToolbarLabels)[]).map((key) => [
      key,
      t(`editor.${key}`),
    ]),
  ) as ToolbarLabels;
}
