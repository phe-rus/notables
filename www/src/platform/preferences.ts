const AUTHOR_NAME = "notables:author-name";

/** The name shown on publications from this device, until profiles exist. */
export function getAuthorName(): string {
  try {
    return localStorage.getItem(AUTHOR_NAME) ?? "";
  } catch {
    return "";
  }
}

export function setAuthorName(name: string): void {
  try {
    localStorage.setItem(AUTHOR_NAME, name);
  } catch {
    // Storage unavailable (private mode): the name is simply not remembered.
  }
}
