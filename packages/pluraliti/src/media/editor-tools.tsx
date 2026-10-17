import { createContext, type ReactNode, useContext } from "react";
import type { AttachmentInput } from "../nodes/attachment/attachment-node";
import { defaultToolbarLabels, type ToolbarLabels } from "../toolbar/toolbar-labels";

interface EditorTools {
  onAttachment?: (input: AttachmentInput) => Promise<void>;
  labels: ToolbarLabels;
  resolvePhoto?: (file: File) => Promise<string>;
  onEdit?: () => void;
}
const Context = createContext<EditorTools>({ labels: defaultToolbarLabels });
export function EditorToolsProvider({ children, ...tools }: EditorTools & { children: ReactNode }) {
  return <Context.Provider value={tools}>{children}</Context.Provider>;
}
export const useEditorTools = () => useContext(Context);
