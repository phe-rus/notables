import { Button } from "@phe-rus/hino/button";
import { t } from "@/i18n/i18n";
import type { UpdateActionsProps } from "../model/types";

export function UpdateActions(props: UpdateActionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button size="sm" onClick={props.onUpdate}>
        {t("updates.update")}
      </Button>
      {props.required ? (
        <Button size="sm" variant="ghost" isPending={props.checking} onClick={props.onCheck}>
          {t("updates.checkAgain")}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={props.onDismiss}>
          {t("updates.later")}
        </Button>
      )}
    </div>
  );
}
