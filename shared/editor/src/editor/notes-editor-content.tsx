import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cn } from "@notables/ui";
import type { DocumentSnapshot } from "../hooks/use-document-snapshot";
import { DocumentChangePlugin } from "../plugins/document-change/document-change-plugin";
import { FloatingToolbarPlugin } from "../plugins/floating-toolbar/floating-toolbar-plugin";

export interface NotesEditorContentProps {
  placeholder?: string;
  className?: string;
  /** Receives the document and its plain text, debounced, after each edit. */
  onDocumentChange?: (snapshot: DocumentSnapshot) => void;
  /** Accessible name for the writing area. */
  label?: string;
  /** Size the placeholder like the document's first block. */
  placeholderStyle?: "title" | "body";
}

/** The writing surface, with the floating format toolbar. */
export function NotesEditorContent({
  placeholder = "Start writing…",
  className,
  onDocumentChange,
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
      {onDocumentChange && <DocumentChangePlugin onChange={onDocumentChange} />}
    </>
  );
}
