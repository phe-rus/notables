import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type ChipTone = "neutral" | "accent" | "public" | "family" | "friends";

const tones: Record<ChipTone, string> = {
  neutral: "bg-fill text-label-secondary",
  accent: "bg-elevated text-accent-text",
  public: "bg-[#e8efff] text-[#2c55b8] dark:bg-[#1c2740] dark:text-[#a9c1ff]",
  family: "bg-[#e3f3eb] text-[#24704f] dark:bg-[#15302a] dark:text-[#8fd6b6]",
  friends: "bg-[#ede8ff] text-[#5a3fc0] dark:bg-[#26203f] dark:text-[#c3b5ff]",
};

export function Chip({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-[7px] py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
