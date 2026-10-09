import { cn } from "@ultrapeach/ui";
import { useId } from "react";

/**
 * The Notables mark: a sheet of warm paper with a quiet dog-ear, an ink "N"
 * and a honey full stop. Brand colors stay fixed whatever accent people
 * choose. Source artwork: src-tauri/icons/source/app-icon-desktop.svg.
 */
export function AppMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId();
  const ref = (name: string) => `${id}-${name}`;
  const url = (name: string) => `url(#${ref(name)})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      data-brand
    >
      <defs>
        <linearGradient id={ref("sheet")} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#FFFEFB" />
          <stop offset="1" stopColor="#F2EADC" />
        </linearGradient>
        <filter id={ref("fold")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="-10"
            dy="14"
            stdDeviation="14"
            floodColor="#5A4020"
            floodOpacity="0.18"
          />
        </filter>
        <filter id={ref("drop")} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" floodColor="#4A3418" floodOpacity="0.22" />
        </filter>
        <clipPath id={ref("frame")}>
          <rect width="1024" height="1024" rx="230" />
        </clipPath>
      </defs>
      <g transform="translate(100 92) scale(0.8047)">
        <rect width="1024" height="1024" rx="230" fill="#E3D6C2" filter={url("drop")} />
        <g clipPath={url("frame")}>
          <path d="M0 0H700L1024 324V1024H0Z" fill={url("sheet")} />
          <path d="M700 0L1024 324H760Q700 324 700 264Z" fill="#F6EEE2" filter={url("fold")} />
          <path
            d="M300 760V420c0-12 15-17 22-7l232 330c7 10 22 5 22-7V520"
            fill="none"
            stroke="#2A2520"
            strokeWidth="80"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="682" cy="760" r="41" fill="#EE8A2A" />
        </g>
      </g>
    </svg>
  );
}
