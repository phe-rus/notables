import { MoreIcon } from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { useCallback, useRef, useState } from "react";
import { CompactActionPopover } from "@/components/actions/compact-action-popover";
import type { FolderActionsProps } from "@/features/library/model/workspace-types";
import { t } from "@/i18n/i18n";

export function FolderActions({ name, actions }: FolderActionsProps) {
  const owner = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  return (
    <span ref={owner} className="me-2 shrink-0">
      <IconButton
        size="icon-xs"
        className="[@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-1.5 [@media(pointer:coarse)]:before:content-['']"
        variant="ghost"
        label={t("workspace.folderOptions", { name })}
        aria-expanded={anchor !== null}
        aria-haspopup="dialog"
        onClick={(event) => {
          const target = event.currentTarget;
          setAnchor((current) => (current ? null : target));
        }}
      >
        <MoreIcon size={18} />
      </IconButton>
      {anchor && (
        <CompactActionPopover
          title={name}
          hint={t("common.actionHint")}
          actions={actions}
          anchor={anchor}
          owner={owner}
          onClose={close}
        />
      )}
    </span>
  );
}
