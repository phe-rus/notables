/**
 * What the writing helper can do with a note. Each action says what to
 * send and what to do with the reply.
 */
export type WritingActionId = "summarize" | "improve" | "proofread" | "continue" | "title";

export interface WritingAction {
  id: WritingActionId;
  label: string;
  /** Works on the selection when there is one. */
  usesSelection: boolean;
  /** How the reply goes back into the note. */
  apply: "insert-below" | "replace" | "title";
  applyLabel: string;
  prompt: (text: string) => string;
}

const PLAIN =
  "Reply with the result only: no preamble, no quotation marks around it, and no Markdown. Separate paragraphs with a blank line. Keep the writer's language.";

export const WRITING_SYSTEM = `You help someone with their own writing in a notes app. Respect their voice, meaning and language; never add facts they didn't give. ${PLAIN}`;

export const writingActions: WritingAction[] = [
  {
    id: "summarize",
    label: "Summarize",
    usesSelection: true,
    apply: "insert-below",
    applyLabel: "Add below",
    prompt: (text) => `Summarize this in a few sentences:\n\n${text}`,
  },
  {
    id: "improve",
    label: "Improve writing",
    usesSelection: true,
    apply: "replace",
    applyLabel: "Replace",
    prompt: (text) =>
      `Make this clearer and smoother while keeping the writer's voice and meaning:\n\n${text}`,
  },
  {
    id: "proofread",
    label: "Fix spelling and grammar",
    usesSelection: true,
    apply: "replace",
    applyLabel: "Replace",
    prompt: (text) =>
      `Correct spelling, grammar and punctuation only. Change nothing else:\n\n${text}`,
  },
  {
    id: "continue",
    label: "Continue writing",
    usesSelection: false,
    apply: "insert-below",
    applyLabel: "Add below",
    prompt: (text) =>
      `Continue this piece with one or two paragraphs in the same voice and style. Reply with the new paragraphs only:\n\n${text}`,
  },
  {
    id: "title",
    label: "Suggest a title",
    usesSelection: false,
    apply: "title",
    applyLabel: "Use as title",
    prompt: (text) =>
      `Suggest one short title for this note. Reply with the title only:\n\n${text}`,
  },
];
