import {
  ArrowLeft01Icon,
  Book02Icon,
  BookOpen01Icon,
  CheckListIcon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  Delete02Icon,
  FavouriteIcon,
  CanvasIcon as HugeCanvasIcon,
  GlobeIcon as HugeGlobeIcon,
  PauseIcon as HugePauseIcon,
  PlayIcon as HugePlayIcon,
  StarIcon as HugeStarIcon,
  ThumbsUpIcon as HugeThumbsUpIcon,
  Image01Icon,
  Link01Icon,
  Mic01Icon,
  Mortarboard01Icon,
  Note01Icon,
  NotebookIcon,
  PaintBoardIcon,
  PencilEdit02Icon,
  Pin02Icon,
  QuillWrite02Icon,
  Search01Icon,
  Share08Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { SVGProps } from "react";
import { cn } from "../lib/class-names";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number;
  strokeWidth?: number;
};

/** Hugeicons (stroke rounded), sized and weighted for the Notables UI. */
function icon(svg: IconSvgElement, displayName: string) {
  const Icon = ({ size = 20, strokeWidth = 1.6, ...props }: IconProps) => (
    <HugeiconsIcon icon={svg} size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />
  );
  Icon.displayName = displayName;
  return Icon;
}

/** A filled variant for toggled states (hearted, starred). */
function toggleIcon(svg: IconSvgElement, displayName: string) {
  const Base = icon(svg, displayName);
  const Icon = ({ filled = false, className, ...props }: IconProps & { filled?: boolean }) => (
    <Base className={cn(filled && "[&_path]:fill-current", className)} {...props} />
  );
  Icon.displayName = displayName;
  return Icon;
}

export const NoteIcon = icon(Note01Icon, "NoteIcon");
export const JournalIcon = icon(NotebookIcon, "JournalIcon");
export const PenIcon = icon(PencilEdit02Icon, "PenIcon");
export const StoryIcon = icon(QuillWrite02Icon, "StoryIcon");
export const BookIcon = icon(BookOpen01Icon, "BookIcon");
export const ArticleIcon = icon(Book02Icon, "ArticleIcon");
export const CanvasIcon = icon(HugeCanvasIcon, "CanvasIcon");
export const LessonIcon = icon(Mortarboard01Icon, "LessonIcon");
export const PlanIcon = icon(CheckListIcon, "PlanIcon");
export const MicIcon = icon(Mic01Icon, "MicIcon");
export const GlobeIcon = icon(HugeGlobeIcon, "GlobeIcon");
export const ChecklistIcon = icon(CheckmarkCircle02Icon, "ChecklistIcon");
export const PhotoIcon = icon(Image01Icon, "PhotoIcon");
export const DrawIcon = icon(PaintBoardIcon, "DrawIcon");
export const ShareIcon = icon(Share08Icon, "ShareIcon");
export const SearchIcon = icon(Search01Icon, "SearchIcon");
export const ChevronLeftIcon = icon(ArrowLeft01Icon, "ChevronLeftIcon");
export const LinkIcon = icon(Link01Icon, "LinkIcon");
export const CommentIcon = icon(Comment01Icon, "CommentIcon");
export const TrashIcon = icon(Delete02Icon, "TrashIcon");
export const PinIcon = icon(Pin02Icon, "PinIcon");
export const SidebarIcon = icon(SidebarLeftIcon, "SidebarIcon");
export const PlayIcon = icon(HugePlayIcon, "PlayIcon");
export const PauseIcon = icon(HugePauseIcon, "PauseIcon");
export const ThumbsUpIcon = toggleIcon(HugeThumbsUpIcon, "ThumbsUpIcon");
export const HeartIcon = toggleIcon(FavouriteIcon, "HeartIcon");
export const StarIcon = toggleIcon(HugeStarIcon, "StarIcon");
