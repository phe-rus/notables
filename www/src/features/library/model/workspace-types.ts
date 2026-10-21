import type { AccentId } from "@phe-rus/hino/tokens";
import type { CompactAction } from "@/components/actions/types";

export type EditingFolder = { id: string | null; name: string; color?: AccentId };
export type FolderActionsProps = { name: string; actions: readonly CompactAction[] };
