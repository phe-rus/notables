import { Link } from "@tanstack/react-router";
import { CheckIcon, Chip, cn, haptic, openContextMenu, PinIcon, spring } from "@ultrapeach/ui";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { type MouseEvent, type PointerEvent, useEffect, useRef } from "react";
import { t } from "../../../i18n/i18n";
import type { ListPreferences } from "../../settings/model/preferences";
import { formatUpdated } from "../lib/date-format";
import { noteKindLabels } from "../model/note-kind-labels";
import type { LibraryEntry } from "../store/library-store";
import { moreButton, type SwipeButton, swipeButton } from "./note-swipe-actions";

/** Which side a row is swiped open to show its actions. */
export type SwipeSide = "right" | "left";

const BUTTON_WIDTH = 74;
/** Past this share of the row, letting go runs the outermost action, as on iOS. */
const FULL_SWIPE = 0.6;
const SLOP = 10;

/** Where a row rests: closed, or open just wide enough for its buttons. */
const restingX = (side: SwipeSide | null, leading: number, trailing: number) =>
  side === "right" ? leading * BUTTON_WIDTH : side === "left" ? -trailing * BUTTON_WIDTH : 0;

/** Written out whole so Tailwind finds each class. */
const previewClamp: Record<number, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
};

export function NoteRow({
  entry,
  snippet,
  active,
  pinMark,
  options,
  selecting,
  selected,
  swiped,
  onSwipe,
  menu,
  onTap,
}: {
  entry: LibraryEntry;
  snippet?: string;
  active: boolean;
  pinMark: boolean;
  options: ListPreferences;
  selecting: boolean;
  selected: boolean;
  /** The side this row is open to, if any. */
  swiped: SwipeSide | null;
  onSwipe: (side: SwipeSide | null) => void;
  menu: () => Parameters<typeof openContextMenu>[2];
  /** Returns true when the list handled the tap (selecting, closing a swipe). */
  onTap: () => boolean;
}) {
  const kind = entry.kind === "note" || !options.kindTags ? null : noteKindLabels[entry.kind];
  const compact = options.density === "compact";
  const date = options.showDates ? formatUpdated(entry.updatedAt) : null;

  // Swipe right shows the right-swipe action on the left edge; swipe left
  // shows More and the left-swipe action on the right edge.
  const leading = [swipeButton(options.swipeRight, entry)].filter(Boolean) as SwipeButton[];
  const openMenu = (event?: { clientX: number; clientY: number }) => {
    const rect = row.current?.getBoundingClientRect();
    openContextMenu(
      event?.clientX ?? rect?.right ?? 0,
      event?.clientY ?? rect?.top ?? 0,
      menu(),
      true,
    );
  };
  const trailing = [moreButton(() => openMenu()), swipeButton(options.swipeLeft, entry)].filter(
    Boolean,
  ) as SwipeButton[];

  const row = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const leadingWidth = useTransform(x, (value) => Math.max(value, 0));
  const trailingWidth = useTransform(x, (value) => Math.max(-value, 0));
  const drag = useRef<{
    x: number;
    y: number;
    base: number;
    active: boolean;
    full: boolean;
  } | null>(null);
  const suppressTap = useRef(false);

  const leadingCount = leading.length;
  const trailingCount = trailing.length;
  useEffect(() => {
    if (drag.current?.active) return;
    animate(x, restingX(swiped, leadingCount, trailingCount), spring.snappy);
  }, [swiped, x, leadingCount, trailingCount]);

  const run = (button: SwipeButton | undefined) => {
    onSwipe(null);
    // Closed here too: the list's state may already say closed.
    if (button?.id !== "delete") animate(x, 0, spring.snappy);
    button?.run();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || selecting) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      base: x.get(),
      active: false,
      full: false,
    };
  };
  const onPointerMove = (event: PointerEvent) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.active) {
      if (row.current?.closest("[data-holding]")) {
        drag.current = null;
      } else if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy) * 1.2) {
        start.active = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (Math.abs(dy) > SLOP) {
        drag.current = null;
      }
      return;
    }
    let next = start.base + dx;
    // No actions on a side: it gives a little, then stops.
    if ((next > 0 && leading.length === 0) || (next < 0 && trailing.length === 0)) next *= 0.15;
    x.set(next);
    const width = row.current?.offsetWidth ?? 1;
    const full = Math.abs(next) > width * FULL_SWIPE;
    if (full !== start.full) {
      start.full = full;
      haptic("light");
    }
  };
  const onPointerUp = () => {
    const start = drag.current;
    drag.current = null;
    if (!start?.active) return;
    suppressTap.current = true;
    const value = x.get();
    if (start.full) {
      // The outermost action: the only one on the left, the last on the right.
      const button = value > 0 ? leading[0] : trailing.at(-1);
      const width = row.current?.offsetWidth ?? 0;
      if (button?.id === "delete") {
        void animate(x, -width, spring.snappy).then(() => run(button));
      } else run(button);
      return;
    }
    const side: SwipeSide | null =
      value > (leading.length * BUTTON_WIDTH) / 2
        ? "right"
        : value < -(trailing.length * BUTTON_WIDTH) / 2
          ? "left"
          : null;
    onSwipe(side);
    animate(x, restingX(side, leadingCount, trailingCount), spring.snappy);
  };

  const onClick = (event: MouseEvent) => {
    if (suppressTap.current || onTap()) {
      suppressTap.current = false;
      event.preventDefault();
    }
  };

  return (
    <div
      ref={row}
      data-note-id={entry.id}
      className="relative isolate overflow-hidden rounded-xl transition-transform duration-fast select-none data-[held]:scale-[0.98]"
    >
      <motion.div
        aria-hidden={swiped !== "right"}
        className="absolute inset-y-0 left-0 flex overflow-hidden"
        style={{ width: leadingWidth }}
      >
        {leading.map((button) => (
          <SwipeAction key={button.id} button={button} onRun={() => run(button)} />
        ))}
      </motion.div>
      <motion.div
        aria-hidden={swiped !== "left"}
        className="absolute inset-y-0 right-0 flex overflow-hidden"
        style={{ width: trailingWidth }}
      >
        {trailing.map((button) => (
          <SwipeAction key={button.id} button={button} onRun={() => run(button)} />
        ))}
      </motion.div>
      <motion.div
        style={{ x }}
        className="relative bg-surface touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Link
          to="/notes/$noteId"
          params={{ noteId: entry.id }}
          search={(s) => s}
          draggable={false}
          onClick={onClick}
          onContextMenu={(event) => {
            event.preventDefault();
            openContextMenu(event.clientX, event.clientY, menu(), false);
          }}
          aria-selected={selecting ? selected : undefined}
          className={cn(
            "group relative isolate flex items-start rounded-xl px-3 no-underline transition-colors duration-fast [-webkit-touch-callout:none]",
            compact ? "py-2" : "py-3",
            !active && !selected && "hover:bg-fill/60",
          )}
        >
          {(active || selected) && (
            <motion.span
              layoutId={selected ? undefined : "note-selection"}
              className="absolute inset-0 -z-10 rounded-xl bg-accent-soft"
              transition={spring.snappy}
            />
          )}
          <motion.span
            className="flex shrink-0 overflow-hidden"
            initial={false}
            animate={{ width: selecting ? 32 : 0, opacity: selecting ? 1 : 0 }}
            transition={spring.snappy}
          >
            <span
              className={cn(
                "mt-px flex size-[22px] items-center justify-center rounded-full border-[1.5px] transition-colors",
                selected ? "border-accent bg-accent text-on-accent" : "border-label-tertiary",
              )}
            >
              {selected && <CheckIcon size={13} strokeWidth={2.6} />}
            </span>
          </motion.span>
          <span className={cn("flex min-w-0 grow flex-col", compact ? "gap-px" : "gap-[3px]")}>
            <span className="flex items-center gap-1.5 text-subheadline font-semibold text-label">
              {pinMark && <PinIcon size={13} className="text-accent-text" />}
              <span className="truncate">{entry.title || t("notes.newNote")}</span>
              {compact && date && (
                <span className="ms-auto shrink-0 text-caption font-normal text-label-tertiary">
                  {date}
                </span>
              )}
            </span>
            {(options.previewLines > 0 || snippet) && (
              <span
                className={cn(
                  "text-footnote text-label-secondary",
                  previewClamp[options.previewLines || 1],
                )}
              >
                {!compact && date && <b className="font-medium text-label">{date}</b>}
                {!compact && date && "  "}
                {snippet ?? (entry.excerpt || t("notes.noText"))}
              </span>
            )}
            {!compact && (kind || entry.publicationId) && (
              <span className="mt-[3px] flex gap-1.5">
                {entry.publicationId && <Chip tone="public">{t("notes.public")}</Chip>}
                {kind && <Chip tone={active || selected ? "accent" : "neutral"}>{kind}</Chip>}
              </span>
            )}
          </span>
        </Link>
      </motion.div>
    </div>
  );
}

function SwipeAction({ button, onRun }: { button: SwipeButton; onRun: () => void }) {
  return (
    <button
      type="button"
      data-swipe-action
      onClick={onRun}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden text-caption font-medium",
        button.tone,
      )}
    >
      {button.icon}
      <span className="max-w-full truncate px-1">{button.label}</span>
    </button>
  );
}
