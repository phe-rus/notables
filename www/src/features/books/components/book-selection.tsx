import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface BookSelection {
  selecting: boolean;
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  /** Starts selecting, optionally with one book already chosen. */
  start: (id?: string) => void;
  setAll: (ids: string[]) => void;
  stop: () => void;
}

const Context = createContext<BookSelection | null>(null);

/** Choosing several books at once, to act on them together. */
export function BookSelectionProvider({ children }: { children: ReactNode }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const start = useCallback((id?: string) => {
    setSelecting(true);
    setSelected(new Set(id ? [id] : []));
  }, []);
  const setAll = useCallback((ids: string[]) => setSelected(new Set(ids)), []);
  const stop = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  const value = useMemo(
    () => ({ selecting, selected, toggle, start, setAll, stop }),
    [selecting, selected, toggle, start, setAll, stop],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBookSelection(): BookSelection {
  const value = useContext(Context);
  if (!value) throw new Error("useBookSelection needs a BookSelectionProvider");
  return value;
}
