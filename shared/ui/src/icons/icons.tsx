import {
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Book02Icon,
  BookOpen01Icon,
  Cancel01Icon,
  CheckListIcon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  Delete02Icon,
  Download01Icon,
  DragDropVerticalIcon,
  FavouriteIcon,
  Globe02Icon,
  GoBackward15SecIcon,
  GoForward30SecIcon,
  CanvasIcon as HugeCanvasIcon,
  HeadphonesIcon as HugeHeadphonesIcon,
  HighlighterIcon as HugeHighlighterIcon,
  PauseIcon as HugePauseIcon,
  PlayIcon as HugePlayIcon,
  StarIcon as HugeStarIcon,
  ThumbsUpIcon as HugeThumbsUpIcon,
  Image01Icon,
  Invoice03Icon,
  LeftToRightListBulletIcon,
  Link01Icon,
  Mic01Icon,
  Moon02Icon,
  Mortarboard01Icon,
  NextIcon,
  Note01Icon,
  NotebookIcon,
  PencilEdit02Icon,
  PencilIcon,
  Pin02Icon,
  PreviousIcon,
  PrinterIcon,
  QrCodeIcon,
  QuillWrite02Icon,
  ScanIcon,
  Search01Icon,
  Settings02Icon,
  Share08Icon,
  SidebarLeftIcon,
  Tick02Icon,
  ViewIcon,
  ViewOffSlashIcon,
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
export const GlobeIcon = icon(Globe02Icon, "GlobeIcon");
export const ChecklistIcon = icon(CheckmarkCircle02Icon, "ChecklistIcon");
export const PhotoIcon = icon(Image01Icon, "PhotoIcon");
export const DrawIcon = icon(PencilIcon, "DrawIcon");
export const ShareIcon = icon(Share08Icon, "ShareIcon");
export const SearchIcon = icon(Search01Icon, "SearchIcon");
export const ChevronLeftIcon = icon(ArrowLeft01Icon, "ChevronLeftIcon");
export const ChevronRightIcon = icon(ArrowRight01Icon, "ChevronRightIcon");
export const ChevronUpIcon = icon(ArrowUp01Icon, "ChevronUpIcon");
export const ChevronDownIcon = icon(ArrowDown01Icon, "ChevronDownIcon");
export const CloseIcon = icon(Cancel01Icon, "CloseIcon");
export const PlusIcon = icon(Add01Icon, "PlusIcon");
export const LinkIcon = icon(Link01Icon, "LinkIcon");
export const CommentIcon = icon(Comment01Icon, "CommentIcon");
export const TrashIcon = icon(Delete02Icon, "TrashIcon");
export const PinIcon = icon(Pin02Icon, "PinIcon");
export const SidebarIcon = icon(SidebarLeftIcon, "SidebarIcon");
export const SettingsIcon = icon(Settings02Icon, "SettingsIcon");
export const DragHandleIcon = icon(DragDropVerticalIcon, "DragHandleIcon");
export const VisibleIcon = icon(ViewIcon, "VisibleIcon");
export const HiddenIcon = icon(ViewOffSlashIcon, "HiddenIcon");
export const CheckIcon = icon(Tick02Icon, "CheckIcon");
export const InvoiceIcon = icon(Invoice03Icon, "InvoiceIcon");
export const QrCodeGlyph = icon(QrCodeIcon, "QrCodeGlyph");
export const ScanCodeIcon = icon(ScanIcon, "ScanCodeIcon");
export const VerifiedIcon = icon(CheckmarkBadge01Icon, "VerifiedIcon");
export const WarningIcon = icon(Alert02Icon, "WarningIcon");
export const PrintIcon = icon(PrinterIcon, "PrintIcon");
export const DownloadIcon = icon(Download01Icon, "DownloadIcon");
export const PlayIcon = icon(HugePlayIcon, "PlayIcon");
export const PauseIcon = icon(HugePauseIcon, "PauseIcon");
export const SkipBackIcon = icon(GoBackward15SecIcon, "SkipBackIcon");
export const SkipForwardIcon = icon(GoForward30SecIcon, "SkipForwardIcon");
export const PreviousTrackIcon = icon(PreviousIcon, "PreviousTrackIcon");
export const NextTrackIcon = icon(NextIcon, "NextTrackIcon");
export const HeadphonesIcon = icon(HugeHeadphonesIcon, "HeadphonesIcon");
export const HighlighterIcon = icon(HugeHighlighterIcon, "HighlighterIcon");
export const ChaptersIcon = icon(LeftToRightListBulletIcon, "ChaptersIcon");
export const SleepIcon = icon(Moon02Icon, "SleepIcon");
export const ThumbsUpIcon = toggleIcon(HugeThumbsUpIcon, "ThumbsUpIcon");
export const HeartIcon = toggleIcon(FavouriteIcon, "HeartIcon");
export const StarIcon = toggleIcon(HugeStarIcon, "StarIcon");
