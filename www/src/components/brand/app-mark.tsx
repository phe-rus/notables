import { cn } from "@notables/ui";
import { useId } from "react";

/**
 * The Notables mark: a small stack of warm paper whose top page is lifting
 * at the corner, showing honey underneath, with an ink "N" finished by a
 * honey full stop. Brand colors stay fixed whatever accent people choose.
 * Source artwork: src-tauri/icons/source/app-icon.svg.
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
        <linearGradient id={ref("sheet")} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#FFFEFB" />
          <stop offset="1" stopColor="#F1E9DA" />
        </linearGradient>
        <linearGradient id={ref("honey")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC24E" />
          <stop offset="1" stopColor="#F08A2A" />
        </linearGradient>
        <linearGradient id={ref("under")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EEE2D0" />
          <stop offset="1" stopColor="#DDCDB4" />
        </linearGradient>
        <linearGradient id={ref("inside")} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
          <stop offset="0" stopColor="#E9762A" />
          <stop offset="0.35" stopColor="#F7A53A" />
          <stop offset="0.7" stopColor="#FFC857" />
          <stop offset="1" stopColor="#F48E2C" />
        </linearGradient>
        <linearGradient id={ref("back")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF8EE" />
          <stop offset="1" stopColor="#EBDCCB" />
        </linearGradient>
        <filter id={ref("drop")} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="30" stdDeviation="34" floodColor="#6B4400" floodOpacity="0.2" />
        </filter>
        <filter id={ref("lift")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="-18"
            dy="26"
            stdDeviation="22"
            floodColor="#7A3E00"
            floodOpacity="0.32"
          />
        </filter>
      </defs>
      <g filter={url("drop")}>
        <rect x="140" y="196" width="744" height="720" rx="176" fill={url("under")} />
        <rect x="134" y="160" width="752" height="728" rx="176" fill={url("honey")} />
      </g>
      <path
        d="M310 126H468C556 126 586 238 646 318C704 396 772 452 886 478V700A176 176 0 0 1 710 876H310A176 176 0 0 1 134 700V302A176 176 0 0 1 310 126Z"
        fill={url("sheet")}
      />
      <g filter={url("lift")}>
        <path
          d="M468 126C556 126 586 238 646 318C704 396 772 452 886 478C926 446 936 386 916 344C850 352 782 318 724 252C668 188 620 92 468 126Z"
          fill={url("inside")}
        />
        <path
          d="M468 126C620 92 668 188 724 252C782 318 850 352 916 344C900 318 872 312 842 306C786 292 748 250 708 200C664 146 592 104 468 126Z"
          fill={url("back")}
        />
      </g>
      <path
        d="M282 738V420c0-12 15-17 22-7l232 330c7 10 22 5 22-7V520"
        fill="none"
        stroke="#2A2520"
        strokeWidth="78"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="660" cy="738" r="40" fill="#EE8A2A" />
    </svg>
  );
}
