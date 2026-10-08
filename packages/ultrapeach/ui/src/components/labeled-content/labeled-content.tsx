import type { ReactNode } from "react";
import { cn } from "../../lib/class-names";

/**
 * A row: a label, an optional description, and its control at the trailing
 * end, as SwiftUI's `LabeledContent`. Wide controls move under the label
 * when there is no room beside it, rather than squeezing.
 */
export function LabeledContent({
  label,
  description,
  children,
  stacked,
  wide,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  /** Put the control under the label, for wide controls. */
  stacked?: boolean;
  /** A wide control (segmented) that moves under the label on phones. */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-3",
        stacked
          ? "flex-col items-stretch"
          : cn(
              "items-center justify-between",
              wide && "max-sm:flex-col max-sm:items-stretch max-sm:gap-2.5",
            ),
      )}
    >
      <div className="flex min-w-[min(40%,9rem)] flex-col">
        <span className="text-subheadline text-label">{label}</span>
        {description && (
          <span className="text-footnote leading-snug text-label-secondary">{description}</span>
        )}
      </div>
      {/* Controls give way before the label does; a segmented control that
          no longer fits turns into a pop-up button by itself. */}
      <div className={cn("flex min-w-0 justify-end", stacked && "w-full")}>{children}</div>
    </div>
  );
}
