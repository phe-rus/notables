import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { FLOATING_LAYER } from "../../hooks/use-dismiss";
import { CheckIcon } from "../../icons/icons";
import { cn } from "../../lib/class-names";
import { screenEdges } from "../../lib/screen-edges";
import { spring } from "../../motion/transitions";
import {
  type ContextMenuItem,
  closeContextMenu,
  getContextMenu,
  type OpenMenu,
  subscribeContextMenu,
} from "./context-menu-store";

/** Renders the open context menu. Mount once, near the app root. */
export function ContextMenuHost() {
  const menu = useSyncExternalStore(subscribeContextMenu, getContextMenu, () => null);
  return <AnimatePresence>{menu && <Menu key={menu.id} menu={menu} />}</AnimatePresence>;
}

type Action = Extract<ContextMenuItem, { onSelect: () => void }>;
const isAction = (item: ContextMenuItem): item is Action =>
  typeof item === "object" && "onSelect" in item;

function Menu({ menu }: { menu: OpenMenu }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    left: menu.x,
    top: menu.y,
    originX: 0,
    originY: 0,
    maxHeight: undefined as number | undefined,
  });
  const actions = menu.items.filter(isAction).filter((item) => !item.disabled);
  const [focused, setFocused] = useState(-1);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  // Keep the whole menu on screen, opening up or left when near an edge. The
  // layout size, not the on-screen one: the menu is still mid-scale here.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const edges = screenEdges();
    const right = window.innerWidth - edges.right;
    const bottom = window.innerHeight - edges.bottom;
    // Prefer the requested side of the point; take the other when it won't fit.
    const fitsAfterX = menu.x + width <= right;
    const fitsBeforeX = menu.x - width >= edges.left;
    const endX = menu.alignX === "end" ? fitsBeforeX || !fitsAfterX : !fitsAfterX;
    const fitsBelow = menu.y + height <= bottom;
    const fitsAbove = menu.y - height >= edges.top;
    const endY = menu.alignY === "bottom" ? fitsAbove || !fitsBelow : !fitsBelow;
    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), Math.max(min, max));
    setPosition({
      left: clamp(endX ? menu.x - width : menu.x, edges.left, right - width),
      top: clamp(endY ? menu.y - height : menu.y, edges.top, bottom - height),
      originX: endX ? 1 : 0,
      originY: endY ? 1 : 0,
      // Taller than the screen (a phone on its side): it scrolls.
      maxHeight: bottom - edges.top,
    });
  }, [menu]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) closeContextMenu();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu();
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setFocused((index) => {
          const step = event.key === "ArrowDown" ? 1 : -1;
          return (index + step + actions.length) % actions.length;
        });
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const action = actions[focusedRef.current];
        if (action) {
          closeContextMenu();
          action.onSelect();
        }
      }
    };
    const close = () => closeContextMenu();
    // Opened by a long-press: ignore the finger lifting off.
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onPointer, true);
    }, 0);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [actions]);

  let actionIndex = -1;
  return (
    <motion.div
      ref={ref}
      role="menu"
      {...{ [FLOATING_LAYER]: "" }}
      className={cn(
        "glass-menu fixed z-[75] flex min-w-[200px] max-w-[min(280px,calc(100vw-24px))] flex-col overflow-y-auto overscroll-contain rounded-3xl p-1.5",
        menu.touch && "min-w-[240px]",
      )}
      style={{
        left: position.left,
        top: position.top,
        maxHeight: position.maxHeight,
        transformOrigin: `${position.originX * 100}% ${position.originY * 100}%`,
      }}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
      transition={spring.snappy}
      onContextMenu={(event) => event.preventDefault()}
    >
      {menu.items.map((item, index) => {
        if (item === "divider") {
          return <div key={`divider-${index}`} className="mx-2 my-1 h-px bg-separator/80" />;
        }
        if ("heading" in item) {
          return (
            <span
              key={`heading-${item.heading}`}
              className="px-2.5 pt-1.5 pb-0.5 text-caption2 font-semibold text-label-tertiary"
            >
              {item.heading}
            </span>
          );
        }
        if (!item.disabled) actionIndex += 1;
        const current = actionIndex;
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onPointerEnter={() => !item.disabled && setFocused(current)}
            onClick={() => {
              closeContextMenu();
              item.onSelect();
            }}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 text-start text-subheadline transition-colors disabled:opacity-40",
              menu.touch ? "py-2.5" : "py-1.5",
              item.destructive ? "text-danger" : "text-label",
              focused === current &&
                !item.disabled &&
                (item.destructive ? "bg-danger/10" : "bg-fill"),
            )}
          >
            <span className="flex w-4 shrink-0 justify-center text-label-secondary">
              {item.checked ? (
                <CheckIcon size={15} strokeWidth={2.4} className="text-accent-text" />
              ) : (
                item.icon
              )}
            </span>
            <span className="grow truncate">{item.label}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
