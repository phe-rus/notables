let openedNote: string | undefined;

export function isTransitionNote(id: string) {
  return openedNote === id;
}

export function rememberNoteTransition(id: string) {
  openedNote = id;
}

/** Match only the tapped card to the editor, avoiding snapshots of the whole gallery. */
export function prepareNoteTransition(id: string, target: HTMLElement) {
  rememberNoteTransition(id);
  for (const element of document.querySelectorAll("a[data-note-transition]")) {
    element.removeAttribute("data-note-transition");
  }
  target.setAttribute("data-note-transition", "");
}
