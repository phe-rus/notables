import { type ContextMenuItem, haptic, openContextMenu } from "@ultrapeach/ui";
import { type RefObject, useEffect, useRef } from "react";

const HOLD_MS = 450;
/** A finger moving this far before the hold lands is scrolling or swiping. */
const SLOP = 10;
/** Moving this far after the hold lands starts selecting instead of the menu. */
const DRAG_START = 6;
/** Near the top or bottom edge, the list scrolls itself while selecting. */
const EDGE = 64;
const MAX_SPEED = 14;

interface Options {
  /** The scrolling list; its rows carry `data-note-id`. */
  list: RefObject<HTMLElement | null>;
  /** Every listed note id, top to bottom. */
  order: readonly string[];
  selecting: boolean;
  selected: ReadonlySet<string>;
  /** Replaces the selection, entering selection mode. */
  select: (ids: ReadonlySet<string>) => void;
  menu: (id: string) => ContextMenuItem[];
}

interface Press {
  id: string;
  row: HTMLElement;
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout>;
  held: boolean;
  dragging: boolean;
  /** The selection before this slide, which the slide adds to or takes from. */
  base: Set<string>;
  adding: boolean;
  lastX: number;
  lastY: number;
}

/**
 * Touch and hold a note, the way iOS lists and Photos work: let go to see
 * its menu, or keep the finger down and slide to select every note it
 * passes over. Mouse and trackpad keep right-click.
 */
export function useHoldToSelect(options: Options) {
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const list = latest.current.list.current;
    if (!list) return;
    let press: Press | null = null;
    let suppressClick = false;
    let lastPointer = "";
    let frame = 0;

    const release = () => {
      if (!press) return;
      clearTimeout(press.timer);
      delete press.row.dataset.held;
      delete list.dataset.holding;
      press = null;
      cancelAnimationFrame(frame);
    };

    const rowAt = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest("[data-note-id]") as HTMLElement | null)?.dataset
        .noteId;

    const extendTo = (id: string | undefined) => {
      if (!press || !id) return;
      const { order, select, selected } = latest.current;
      const from = order.indexOf(press.id);
      const to = order.indexOf(id);
      if (from < 0 || to < 0) return;
      const next = new Set(press.base);
      for (let index = Math.min(from, to); index <= Math.max(from, to); index++) {
        const each = order[index] as string;
        if (press.adding) next.add(each);
        else next.delete(each);
      }
      if (next.size !== selected.size) haptic("selection");
      select(next);
    };

    // While selecting near an edge, keep scrolling and keep selecting.
    const autoScroll = () => {
      if (!press?.dragging) return;
      const rect = list.getBoundingClientRect();
      const fromTop = press.lastY - rect.top;
      const fromBottom = rect.bottom - press.lastY;
      const speed =
        fromTop < EDGE
          ? -MAX_SPEED * (1 - Math.max(fromTop, 0) / EDGE)
          : fromBottom < EDGE
            ? MAX_SPEED * (1 - Math.max(fromBottom, 0) / EDGE)
            : 0;
      if (speed !== 0) {
        list.scrollTop += speed;
        extendTo(rowAt(press.lastX, press.lastY));
      }
      frame = requestAnimationFrame(autoScroll);
    };

    const onPointerDown = (event: PointerEvent) => {
      lastPointer = event.pointerType;
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      const target = event.target as Element;
      if (target.closest("[data-swipe-action]")) return;
      const row = target.closest("[data-note-id]") as HTMLElement | null;
      const id = row?.dataset.noteId;
      if (!row || !id) return;
      release();
      const current: Press = {
        id,
        row,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        held: false,
        dragging: false,
        base: new Set(),
        adding: true,
        timer: setTimeout(() => {
          current.held = true;
          row.dataset.held = "";
          // Rows read this to leave swiping alone while a hold is on.
          list.dataset.holding = "";
          haptic("medium");
        }, HOLD_MS),
      };
      press = current;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!press || !event.isPrimary) return;
      press.lastX = event.clientX;
      press.lastY = event.clientY;
      const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (!press.held) {
        if (distance > SLOP) release();
        return;
      }
      if (!press.dragging) {
        if (distance < DRAG_START) return;
        const { selecting, selected } = latest.current;
        press.dragging = true;
        delete press.row.dataset.held;
        press.base = new Set(selecting ? selected : []);
        // Starting on a chosen note takes notes out instead, as in Photos.
        press.adding = !(selecting && selected.has(press.id));
        extendTo(press.id);
        frame = requestAnimationFrame(autoScroll);
      }
      extendTo(rowAt(event.clientX, event.clientY));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!press || !event.isPrimary) return;
      if (press.held) {
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 400);
        if (!press.dragging) {
          const { x, y, id } = press;
          openContextMenu(x, y, latest.current.menu(id), true);
        }
      }
      release();
    };

    // Once the hold lands the finger belongs to selecting, not scrolling.
    const onTouchMove = (event: TouchEvent) => {
      if (press?.held) event.preventDefault();
    };
    // The lifting finger shouldn't also open the note.
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    // Android sends its own long-press menu event; the hold above stands for it.
    const onContextMenu = (event: MouseEvent) => {
      if (lastPointer !== "touch") return;
      event.preventDefault();
      event.stopPropagation();
    };

    list.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", release);
    list.addEventListener("touchmove", onTouchMove, { passive: false });
    list.addEventListener("click", onClick, true);
    list.addEventListener("contextmenu", onContextMenu, true);
    return () => {
      release();
      list.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", release);
      list.removeEventListener("touchmove", onTouchMove);
      list.removeEventListener("click", onClick, true);
      list.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, []);
}
