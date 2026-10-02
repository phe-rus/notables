import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { onAppReady } from "../../platform/app-ready";
import { AppMark } from "../brand/app-mark";

/** Long enough to read as intentional, short enough to never feel slow. */
const MIN_VISIBLE_MS = 450;
/** Never keep anyone waiting on a slow device. */
const MAX_VISIBLE_MS = 4000;
/** The eight spokes of the activity indicator, each a step behind the last. */
const SPOKES = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * The first thing people see while the app opens: the mark settling in on
 * the app's own background, then fading away once their library is ready.
 * Rendered with the page itself, so it appears before any code runs.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const shownAt = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hide = () => {
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt));
      timer = setTimeout(() => setVisible(false), wait);
    };
    const stop = onAppReady(hide);
    const fallback = setTimeout(() => setVisible(false), MAX_VISIBLE_MS);
    return () => {
      stop();
      clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background"
          exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
        >
          {/* CSS animations, so they play on the first paint before any code runs. */}
          <div className="splash-mark drop-shadow-[0_18px_40px_rgba(120,80,0,0.18)]">
            <AppMark size={92} />
          </div>
          <span className="splash-word text-[17px] font-semibold tracking-tight text-label">
            Notables
          </span>
          <span className="splash-spinner absolute bottom-[calc(env(safe-area-inset-bottom)+64px)]">
            {SPOKES.map((spoke) => (
              <i
                key={spoke}
                style={{
                  transform: `rotate(${spoke * 45}deg)`,
                  animationDelay: `${(spoke - SPOKES.length) * 0.1}s`,
                }}
              />
            ))}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
