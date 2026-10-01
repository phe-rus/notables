import { cn } from "../../lib/class-names";

const dots = {
  saved: "bg-success",
  syncing: "bg-warning animate-pulse",
  offline: "bg-label-tertiary",
} as const;

export function StatusIndicator({
  state,
  children,
  className,
}: {
  state: keyof typeof dots;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1.5 text-[13px] text-label-tertiary", className)}>
      <span className={cn("size-[7px] rounded-full", dots[state])} />
      {children}
    </span>
  );
}
