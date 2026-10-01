import type { ReactNode } from "react";
import { cn } from "./cn";

export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2.5 pb-1.5 text-[12px] font-semibold text-label-tertiary">{title}</span>
      {children}
    </div>
  );
}

/** Classes for a sidebar row; apply to the app's router link. */
export function sidebarItemClass(active?: boolean): string {
  return cn(
    "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[14px] text-label no-underline transition-colors duration-fast",
    active ? "bg-accent font-medium text-on-accent" : "hover:bg-fill",
  );
}

export function SidebarItemContent({
  icon,
  count,
  active,
  children,
}: {
  icon: ReactNode;
  count?: number;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <span className={cn("flex", active ? "text-on-accent" : "text-accent-text")}>{icon}</span>
      <span className="grow truncate">{children}</span>
      {count !== undefined && (
        <span className={cn("text-[13px]", active ? "text-on-accent" : "text-label-tertiary")}>
          {count}
        </span>
      )}
    </>
  );
}

/** Classic macOS window controls, shown only in the desktop shell. */
export function TrafficLights() {
  return (
    <div className="flex gap-2 px-2" aria-hidden="true">
      <span className="size-3 rounded-full bg-[#ff5f57]" />
      <span className="size-3 rounded-full bg-[#febc2e]" />
      <span className="size-3 rounded-full bg-[#28c840]" />
    </div>
  );
}
