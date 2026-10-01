import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { LexicalCollaboration } from "@lexical/react/LexicalCollaborationContext";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createParagraphNode, $getRoot } from "lexical";
import { type ReactNode, useCallback } from "react";
import type * as Y from "yjs";
import { type DocumentProvider, toLexicalProvider } from "../collaboration/document-provider";
import { sanitizeUrl } from "../lib/sanitize-url";
import { editorNodes } from "../nodes/node-registry";
import { markdownTransformers } from "../plugins/markdown/markdown-transformers";
import { MediaPlugin } from "../plugins/media/media-plugin";
import { editorTheme } from "./editor-theme";

export interface NotesEditorProps {
  /** Stable id of the note; also the collaboration room id. */
  id: string;
  /** Keeps the editor in a Yjs document. Without it the editor is in-memory. */
  provider?: DocumentProvider;
  /**
   * Seed an empty document with a first paragraph. Only the device that
   * created the note should bootstrap (see ADR-0004).
   */
  bootstrap?: boolean;
  editable?: boolean;
  /** How a new note begins: with a title line (Apple Notes style) or body text. */
  firstBlock?: "title" | "body";
  children: ReactNode;
}

/**
 * Root of a Notables editor. Compose the toolbar(s) and `NotesEditorContent`
 * inside it, in whatever layout the screen needs.
 */
export function NotesEditor({
  id,
  provider,
  bootstrap = false,
  editable = true,
  firstBlock = "title",
  children,
}: NotesEditorProps) {
  // Lexical reconnects when these identities change, so keep them stable.
  const seed = useCallback(() => {
    const root = $getRoot();
    if (root.isEmpty()) {
      root.append(firstBlock === "title" ? $createHeadingNode("h1") : $createParagraphNode());
    }
  }, [firstBlock]);

  const providerFactory = useCallback(
    (docId: string, docMap: Map<string, Y.Doc>) => {
      if (!provider) throw new Error("NotesEditor: providerFactory used without a provider");
      docMap.set(docId, provider.doc);
      return toLexicalProvider(provider);
    },
    [provider],
  );

  const initialConfig = {
    namespace: `notables:${id}`,
    theme: editorTheme,
    nodes: editorNodes,
    editable,
    // With collaboration, the Yjs document is the source of truth.
    editorState: provider ? null : seed,
    onError(error: Error) {
      console.error(error);
    },
  };

  const body = (
    <LexicalComposer initialConfig={initialConfig}>
      {provider ? (
        <CollaborationPlugin
          id={id}
          providerFactory={providerFactory}
          shouldBootstrap={bootstrap}
          initialEditorState={seed}
        />
      ) : (
        <HistoryPlugin />
      )}
      <ListPlugin />
      <CheckListPlugin />
      <LinkPlugin validateUrl={(url) => sanitizeUrl(url) !== null} />
      <ClickableLinkPlugin newTab />
      <HorizontalRulePlugin />
      <TabIndentationPlugin />
      <MarkdownShortcutPlugin transformers={markdownTransformers} />
      <MediaPlugin />
      {children}
    </LexicalComposer>
  );

  return provider ? <LexicalCollaboration>{body}</LexicalCollaboration> : body;
}
