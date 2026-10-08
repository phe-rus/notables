import { cn } from "@ultrapeach/ui";

/** Live input levels as a centred bar waveform; recent bars are highlighted. */
export function LevelMeter({
  levels,
  active,
  className,
}: {
  levels: number[];
  active: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex h-20 items-center justify-center gap-1", className)}
      aria-hidden="true"
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-full transition-[height] duration-100",
            active && index >= levels.length - 12 ? "bg-accent" : "bg-white/25",
          )}
          style={{ height: `${Math.max(8, level * 100)}%` }}
        />
      ))}
    </div>
  );
}
