import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Stroke icons drawn on a 24px grid, inheriting `currentColor`. */
function icon(paths: React.ReactNode, displayName: string) {
  const Icon = ({ size = 20, strokeWidth = 1.8, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const NoteIcon = icon(
  <>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
  </>,
  "NoteIcon",
);
export const JournalIcon = icon(
  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />,
  "JournalIcon",
);
export const PenIcon = icon(
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </>,
  "PenIcon",
);
export const BookIcon = icon(
  <>
    <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
    <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
  </>,
  "BookIcon",
);
export const CanvasIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M7 15c2-4 4 0 6-3s3-2 4-1" />
  </>,
  "CanvasIcon",
);
export const MicIcon = icon(
  <>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
  </>,
  "MicIcon",
);
export const GlobeIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>,
  "GlobeIcon",
);
export const ChecklistIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />
  </>,
  "ChecklistIcon",
);
export const PhotoIcon = icon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M21 16l-5-5-8 8" />
  </>,
  "PhotoIcon",
);
export const DrawIcon = icon(<path d="M3 21c3 0 4-2 5-4l9-9-3-3-9 9c-2 1-4 2-4 5z" />, "DrawIcon");
export const ShareIcon = icon(
  <>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </>,
  "ShareIcon",
);
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </>,
  "SearchIcon",
);
export const ChevronLeftIcon = icon(<path d="M15 5l-7 7 7 7" />, "ChevronLeftIcon");
export const LinkIcon = icon(
  <>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </>,
  "LinkIcon",
);
export const CommentIcon = icon(
  <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" />,
  "CommentIcon",
);
export const TrashIcon = icon(
  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  "TrashIcon",
);
export const PinIcon = icon(<path d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3z" />, "PinIcon");
export const SidebarIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </>,
  "SidebarIcon",
);

export const HeartIcon = ({
  size = 20,
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </svg>
);

export const StarIcon = ({
  size = 18,
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </svg>
);
