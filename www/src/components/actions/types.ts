import type { ContextMenuItem } from "@phe-rus/hino";
import type { RefObject } from "react";

export type CompactAction = Extract<ContextMenuItem, { label: string }>;
export type CompactActionPopoverProps = {
  title: string;
  hint: string;
  actions: readonly CompactAction[];
  anchor: HTMLElement;
  owner: RefObject<HTMLElement | null>;
  onClose: () => void;
};
