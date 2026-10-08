import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, CloseIcon } from "../../icons/icons";
import { cn } from "../../lib/class-names";
import { spring } from "../../motion/transitions";
import {
  getToasts,
  subscribeToasts,
  type Toast,
  type ToastTone,
  toast as toastApi,
  toastLimits,
} from "./toast-store";

const PILL = 40;
const GOO_FILTER_ID = "nt-toast-goo";
const EMPTY: Toast[] = [];
/** A little loose, so the body overshoots and settles like a drop of honey. */
const BODY_SPRING = { type: "spring", stiffness: 260, damping: 19, mass: 0.9 } as const;

/**
 * Toasts drop from the top centre like an island: a small pill carrying the
 * icon, out of which the message flows. Both shapes sit under an SVG "goo"
 * filter, so where they meet looks liquid while they grow, morph between
 * states and shrink away. Text is drawn above the filter to stay crisp.
 */
export function Toaster({ className }: { className?: string }) {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, () => EMPTY);
  const [hovered, setHovered] = useState(false);
  const visible = toasts.slice(0, toastLimits.visible);

  return (
    <>
      <GooFilter />
      <section
        aria-label="Notifications"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-[max(10px,env(safe-area-inset-top))] z-[60] flex justify-center px-3",
          className,
        )}
      >
        <ol
          className="relative flex w-full max-w-[420px] flex-col items-center"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <AnimatePresence initial={false}>
            {visible.map((item, index) => (
              <ToastItem
                key={item.id}
                toast={item}
                index={index}
                expanded={hovered}
                paused={hovered}
              />
            ))}
          </AnimatePresence>
        </ol>
      </section>
    </>
  );
}

function GooFilter() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute size-0">
      <defs>
        <filter id={GOO_FILTER_ID}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

function ToastItem({
  toast,
  index,
  expanded,
  paused,
}: {
  toast: Toast;
  index: number;
  expanded: boolean;
  paused: boolean;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: PILL, height: PILL });
  const [open, setOpen] = useState(false);

  // The body flows out of the pill a beat after it lands.
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 140);
    return () => clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () =>
      setSize({ width: Math.ceil(element.offsetWidth), height: Math.ceil(element.offsetHeight) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (toast.duration === null || paused) return;
    const timer = setTimeout(() => toastApi.dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, toast.createdAt, paused]);

  const width = open ? size.width : PILL;
  const height = open ? size.height : PILL;
  // Older toasts tuck in behind the newest, and fan out on hover.
  const stacked = !expanded && index > 0;

  return (
    <motion.li
      layout
      className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      style={{ zIndex: 10 - index }}
      initial={{ opacity: 0, y: -24, scale: 0.6 }}
      animate={{
        opacity: stacked ? 1 - index * 0.25 : 1,
        y: stacked ? index * 9 : index * (PILL + 14) + index * 6,
        scale: stacked ? 1 - index * 0.05 : 1,
      }}
      exit={{ opacity: 0, y: -18, scale: 0.6, transition: { duration: 0.22 } }}
      transition={spring.bouncy}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0.1 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -30 || info.velocity.y < -300) toastApi.dismiss(toast.id);
      }}
    >
      <motion.div
        role="status"
        className="pointer-events-auto relative"
        initial={{ width: PILL, height: PILL }}
        animate={{ width, height }}
        transition={BODY_SPRING}
      >
        {/* Shapes, under the goo filter; padded so the blur isn't clipped. */}
        <div
          aria-hidden="true"
          className="absolute -inset-3"
          style={{ filter: `url(#${GOO_FILTER_ID})` }}
        >
          <motion.span
            className="absolute top-3 left-3 rounded-full bg-inverse shadow-xl"
            style={{ width: PILL, height: PILL }}
            animate={{ scale: open ? 1 : 1.06 }}
            transition={spring.bouncy}
          />
          <motion.span
            className="absolute top-3 left-3 bg-inverse"
            initial={{ width: PILL, height: PILL, borderRadius: PILL / 2 }}
            animate={{ width, height, borderRadius: Math.min(PILL / 2, height / 2, 22) }}
            transition={BODY_SPRING}
          />
        </div>

        {/* Content, crisp above the shapes. */}
        <motion.div
          ref={content}
          className="absolute top-0 left-0 flex w-max max-w-[min(420px,calc(100vw-24px))] items-start gap-2.5 py-[10px] pr-4 pl-[10px] text-on-inverse"
          style={{ minHeight: PILL }}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: open ? 0.22 : 0.1, delay: open ? 0.08 : 0 }}
        >
          <ToneIcon tone={toast.tone} />
          <div className="flex min-w-0 flex-col py-px">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={toast.title}
                className="text-[14px] leading-5 font-semibold"
                initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={spring.snappy}
              >
                {toast.title}
              </motion.span>
            </AnimatePresence>
            {toast.description && (
              <span className="text-footnote leading-snug text-on-inverse/70">
                {toast.description}
              </span>
            )}
          </div>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                toastApi.dismiss(toast.id);
              }}
              className="ml-1 shrink-0 self-center rounded-full bg-on-inverse/12 px-3 py-1 text-footnote font-semibold text-on-inverse transition-colors hover:bg-on-inverse/20"
            >
              {toast.action.label}
            </button>
          )}
        </motion.div>
      </motion.div>
    </motion.li>
  );
}

const toneColors: Record<ToastTone, string> = {
  neutral: "bg-transparent",
  success: "bg-success text-white",
  error: "bg-danger text-white",
  loading: "bg-on-inverse/15 text-on-inverse",
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={tone}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          toneColors[tone],
        )}
        initial={{ scale: 0.3, opacity: 0, rotate: -40 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.3, opacity: 0 }}
        transition={spring.bouncy}
      >
        {tone === "success" && <CheckIcon size={13} strokeWidth={3} />}
        {tone === "error" && <CloseIcon size={12} strokeWidth={3} />}
        {/* The full stop from the Notables mark. */}
        {tone === "neutral" && <span className="size-2 rounded-full bg-[#EE8A2A]" />}
        {tone === "loading" && <Spinner />}
      </motion.span>
    </AnimatePresence>
  );
}

function Spinner() {
  return (
    <motion.svg
      viewBox="0 0 20 20"
      className="size-4"
      animate={{ rotate: 360 }}
      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, ease: "linear" }}
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.4"
      />
      <path
        d="M10 3a7 7 0 0 1 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}
