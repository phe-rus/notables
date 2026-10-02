import { useCallback, useRef, useState } from "react";
import type { PageScene } from "../model/page-scene";

const LIMIT = 100;

/**
 * The page being drawn, with undo and redo. A gesture previews changes
 * as it goes and becomes one undo step when it ends.
 */
export function useSceneHistory(initial: PageScene) {
  const [state, setState] = useState({
    past: [] as PageScene[],
    present: initial,
    future: [] as PageScene[],
  });
  const base = useRef<PageScene | null>(null);

  /** Shows a change without recording it yet. */
  const preview = useCallback((next: PageScene) => {
    setState((current) => {
      base.current ??= current.present;
      return { ...current, present: next };
    });
  }, []);

  /** Records everything since the gesture began as one step. */
  const commit = useCallback(() => {
    setState((current) => {
      const before = base.current;
      base.current = null;
      if (!before || before === current.present) return current;
      return {
        past: [...current.past, before].slice(-LIMIT),
        present: current.present,
        future: [],
      };
    });
  }, []);

  /** A whole change in one go: preview and commit together. */
  const apply = useCallback((change: (scene: PageScene) => PageScene) => {
    setState((current) => {
      const next = change(current.present);
      if (next === current.present) return current;
      return { past: [...current.past, current.present].slice(-LIMIT), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const [next, ...rest] = current.future;
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: rest };
    });
  }, []);

  return {
    scene: state.present,
    preview,
    commit,
    apply,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    changed: state.past.length > 0,
  };
}
