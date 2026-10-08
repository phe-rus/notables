import { Link } from "@tanstack/react-router";
import { cn, spring } from "@ultrapeach/ui";
import { motion } from "motion/react";
import { type GroupId, type ViewId, viewGroups } from "../model/library-views";

/**
 * The kinds inside a sidebar group, as pills under the list title:
 * "All · Journal · Stories · Articles" or "Books · Manga · Comics".
 */
export function GroupSwitcher({ group, active }: { group: GroupId; active: ViewId | "books" }) {
  const { options } = viewGroups[group];
  return (
    <nav aria-label={viewGroups[group].title} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.id === active;
        return (
          <Link
            key={option.id}
            {...(option.id === "books"
              ? { to: "/books" as const }
              : { to: "/" as const, search: { view: option.id } })}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "relative isolate max-w-full truncate rounded-full px-3.5 py-1.5 text-footnote font-medium no-underline transition-colors",
              selected ? "text-on-inverse" : "bg-fill/70 text-label-secondary hover:text-label",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`group-${group}`}
                className="absolute inset-0 -z-10 rounded-full bg-inverse"
                transition={spring.snappy}
              />
            )}
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
