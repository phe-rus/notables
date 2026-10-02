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
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  state: keyof typeof dots;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn("flex items-center gap-1.5 text-[13px] text-label-tertiary", className)}
      {...props}
    >
      <span className={cn("size-[7px] rounded-full", dots[state])} />
      {children}
    </span>
  );
}
