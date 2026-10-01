import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { LexicalCollaboration } from "@lexical/react/LexicalCollaborationContext";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { $createHeadingNode } from "@lexical/rich-text";
import type { Provider } from "@lexical/yjs";
import { cn } from "@notables/ui";
import { $createParagraphNode, $getRoot } from "lexical";
import { type ReactNode, useCallback } from "react";
import type * as Y from "yjs";
import { nodes } from "./nodes";
import { FloatingToolbarPlugin } from "./plugins/floating-toolbar";
import { transformers } from "./plugins/markdown";
import { MediaPlugin } from "./plugins/media-plugin";
import { TextChangePlugin } from "./plugins/text-change-plugin";
import { theme } from "./theme";
import { sanitizeUrl } from "./url";

/**
 * Anything that can keep a note's Yjs document in sync — `NoteProvider`
 * from `@notables/sync` satisfies this.
 */
export interface DocumentProvider {
  readonly doc: Y.Doc;
  /** A y-protocols `Awareness` (cursor and presence state). */
  readonly awareness: object;
  /** Must not return a promise; see NoteProvider.connect. */
  connect(): void;
  disconnect(): void;
  on(event: "sync" | "status" | "update" | "reload", listener: (...args: never[]) => void): void;
  off(event: "sync" | "status" | "update" | "reload", listener: (...args: never[]) => void): void;
}

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

const adapters = new WeakMap<DocumentProvider, Provider>();

/** Lexical disconnects when the provider identity changes, so adapt each provider once. */
function adapt(provider: DocumentProvider): Provider {
  const cached = adapters.get(provider);
  if (cached) return cached;
  const adapter = {
    awareness: provider.awareness as Provider["awareness"],
    connect: () => provider.connect(),
    disconnect: () => provider.disconnect(),
    on: (type: string, cb: (...args: never[]) => void) => provider.on(type as "sync", cb),
    off: (type: string, cb: (...args: never[]) => void) => provider.off(type as "sync", cb),
  } as Provider;
  adapters.set(provider, adapter);
  return adapter;
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
      return adapt(provider);
    },
    [provider],
  );

  const initialConfig = {
    namespace: `notables:${id}`,
    theme,
    nodes,
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
      <MarkdownShortcutPlugin transformers={transformers} />
      <MediaPlugin />
      {children}
    </LexicalComposer>
  );

  return provider ? <LexicalCollaboration>{body}</LexicalCollaboration> : body;
}

export interface NotesEditorContentProps {
  placeholder?: string;
  className?: string;
  /** Receives the document's plain text, debounced, after each edit. */
  onTextChange?: (text: string) => void;
  /** Accessible name for the writing area. */
  label?: string;
  /** Size the placeholder like the document's first block. */
  placeholderStyle?: "title" | "body";
}

/** The writing surface, with the floating format toolbar. */
export function NotesEditorContent({
  placeholder = "Start writing…",
  className,
  onTextChange,
  label = "Note",
  placeholderStyle = "title",
}: NotesEditorContentProps) {
  return (
    <>
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            aria-label={label}
            className={cn("nt-content", className)}
            aria-placeholder={placeholder}
            placeholder={
              <div className={cn("nt-placeholder", placeholderStyle === "title" && "is-title")}>
                {placeholder}
              </div>
            }
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <FloatingToolbarPlugin />
      {onTextChange && <TextChangePlugin onChange={onTextChange} />}
    </>
  );
}
