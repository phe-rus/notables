import type { ReactNode } from "react";

/**
 * A titled, inset group of rows with an optional footer, as in iOS Settings
 * and SwiftUI's grouped `List` with `Section(header:footer:)`. Rows are
 * usually `LabeledContent`; dividers between them come for free.
 */
export function Section({
  title,
  footer,
  children,
}: {
  /** iOS groups can stand without a header. */
  title?: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      {title && <h2 className="px-4 text-footnote font-medium text-label-tertiary">{title}</h2>}
      {/* A group can be only a note, e.g. where to find something on this device. */}
      {children ? (
        <div className="flex flex-col divide-y divide-separator/60 overflow-hidden rounded-3xl border border-separator/60 bg-elevated">
          {children}
        </div>
      ) : null}
      {footer && <p className="px-4 text-caption leading-snug text-label-tertiary">{footer}</p>}
    </section>
  );
}
