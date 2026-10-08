import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMinimizeOnScroll } from "../../hooks/use-minimize-on-scroll";
import { SearchIcon } from "../../icons/icons";
import { cn } from "../../lib/class-names";
import { spring } from "../../motion/transitions";

export interface TabBarTab<Id extends string = string> {
  id: Id;
  label: string;
  icon: ReactNode;
}

/** What a tab's link receives; spread it onto the router's own link. */
export interface TabBarLinkProps {
  className: string;
  "aria-current": "page" | undefined;
  onClick: () => void;
  children: ReactNode;
}

/**
 * The app's main places a thumb's reach away, drawn as iOS 26 draws them: a
 * floating glass capsule of tabs, with Search as its own round button at the
 * trailing end. Scrolling down through content shrinks the capsule to the
 * current tab; scrolling back up, or a tap, restores it. Android shares the
 * glass, but its bar stays full size, as Android's own bars do.
 *
 * Links stay the app's own (`renderLink`), so the bar works with any router.
 */
export function TabBar<Tab extends TabBarTab>({
  tabs,
  active,
  renderLink,
  search,
  label,
  className,
}: {
  tabs: readonly Tab[];
  /** Null in places the bar has no tab for. */
  active: Tab["id"] | null;
  renderLink: (tab: Tab, props: TabBarLinkProps) => ReactNode;
  search?: { label: string; onPress: () => void };
  /** Names the navigation for screen readers. */
  label: string;
  className?: string;
}) {
  const [scrolledAway, setScrolledAway] = useMinimizeOnScroll();
  // Only a bar with a current tab has something to shrink to; Android's never shrinks.
  const minimized = scrolledAway && active !== null && !onAndroid();
  return (
    <nav
      aria-label={label}
      className={cn(
        "fixed inset-x-4 bottom-[max(14px,env(safe-area-inset-bottom))] z-30 flex items-center gap-3",
        className,
      )}
    >
      <motion.div
        layout
        transition={spring.smooth}
        // A tap on the shrunken capsule brings every tab back.
        onClickCapture={(event) => {
          if (!minimized) return;
          event.preventDefault();
          event.stopPropagation();
          setScrolledAway(false);
        }}
        className={cn(
          "glass flex min-w-0 items-center rounded-full p-0.5",
          minimized ? "grow-0" : "grow",
        )}
      >
        {tabs.map((tab) => {
          const current = tab.id === active;
          if (minimized && !current) return null;
          return renderLink(tab, {
            "aria-current": current ? "page" : undefined,
            // Switching tabs is silent, as on Apple and Android: no haptic.
            onClick: () => {},
            className: cn(
              "relative isolate flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full font-semibold text-[10px] tracking-[0.01em] no-underline transition-[color,transform] duration-fast active:scale-[0.94]",
              minimized ? "w-11" : "flex-1 px-1",
              current ? "text-accent-text" : "text-label-secondary",
            ),
            children: (
              <>
                {current && (
                  <motion.span
                    layoutId="ultrapeach-tab-selection"
                    className="glass-lens absolute inset-0 -z-10 rounded-full"
                    transition={spring.snappy}
                  />
                )}
                {tab.icon}
                {!minimized && <span className="max-w-full truncate">{tab.label}</span>}
              </>
            ),
          });
        })}
      </motion.div>
      {search && (
        <button
          type="button"
          aria-label={search.label}
          onClick={search.onPress}
          className={cn(
            "glass ms-auto flex size-12 shrink-0 items-center justify-center rounded-full text-label transition-transform duration-fast active:scale-[0.92]",
          )}
        >
          <SearchIcon size={19} strokeWidth={2} />
        </button>
      )}
    </nav>
  );
}

function onAndroid() {
  return typeof document !== "undefined" && document.documentElement.dataset.os === "android";
}
