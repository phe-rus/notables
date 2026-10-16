import { CopyIcon, IconButton, LabeledContent, Section, toast } from "@phe-rus/hino";
import { t } from "../../../i18n/i18n";
import { useSpace } from "../../../platform/space/space-identity";

/** The space's ID, the same on every device of it, so the person can tell their devices apart from anyone else's. */
export function SpaceIdSection() {
  const space = useSpace();
  if (!space) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(space.code);
      toast(t("devices.spaceIdCopied"));
    } catch {
      // Clipboard refused (no permission): nothing to undo.
    }
  };

  return (
    <Section title={t("devices.spaceTitle")} footer={t("devices.spaceFooter")}>
      <LabeledContent label={t("devices.spaceId")}>
        <div className="flex items-center gap-1">
          <span className="font-mono text-body whitespace-nowrap tabular-nums select-all" dir="ltr">
            {space.code}
          </span>
          <IconButton
            size="icon-sm"
            variant="ghost"
            label={t("devices.copySpaceId")}
            onClick={() => void copy()}
          >
            <CopyIcon size={16} />
          </IconButton>
        </div>
      </LabeledContent>
    </Section>
  );
}
