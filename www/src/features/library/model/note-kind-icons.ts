import type { NoteKind } from "@notables/core";
import {
  ArticleIcon,
  BookIcon,
  CanvasIcon,
  JournalIcon,
  LessonIcon,
  NoteIcon,
  PlanIcon,
  StoryIcon,
} from "@phe-rus/hino";

export const noteKindIcons: Record<NoteKind, typeof NoteIcon> = {
  note: NoteIcon,
  journal: JournalIcon,
  story: StoryIcon,
  article: ArticleIcon,
  manga: BookIcon,
  comic: CanvasIcon,
  lesson: LessonIcon,
  plan: PlanIcon,
};
