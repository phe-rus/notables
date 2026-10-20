import type { StepTitleProps } from "../model/types";

export function StepTitle({ title, children }: StepTitleProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-title2 leading-tight font-semibold tracking-tight">{title}</h1>
      {children && (
        <p className="text-subheadline leading-relaxed text-label-secondary">{children}</p>
      )}
    </div>
  );
}
