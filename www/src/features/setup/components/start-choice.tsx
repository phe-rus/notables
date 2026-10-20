import { CheckIcon, cn } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import type { StartChoiceProps } from "../model/types";

export function StartChoice({ selected, onSelect, title, body }: StartChoiceProps) {
  return (
    <Button
      variant="ghost"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "h-auto min-h-11 w-full items-start justify-start gap-3 whitespace-normal rounded-2xl border p-3 text-start",
        selected ? "border-accent/50 bg-accent-soft" : "border-separator bg-fill/60 hover:bg-fill",
      )}
    >
      <span className="flex grow flex-col gap-0.5">
        <span className="text-subheadline font-semibold">{title}</span>
        <span className="text-footnote font-normal leading-snug text-label-secondary">{body}</span>
      </span>
      <CheckIcon
        size={16}
        strokeWidth={2.6}
        className={cn("mt-0.5 shrink-0 text-accent-text", !selected && "invisible")}
      />
    </Button>
  );
}
