let openedFolder: string | undefined;

export function isTransitionFolder(id: string) {
  return openedFolder === id;
}

export function rememberFolderTransition(id: string) {
  openedFolder = id;
}

export function prepareFolderTransition(id: string, target: HTMLElement) {
  rememberFolderTransition(id);
  for (const element of document.querySelectorAll("[data-folder-transition]")) {
    element.removeAttribute("data-folder-transition");
  }
  target.setAttribute("data-folder-transition", "");
}
