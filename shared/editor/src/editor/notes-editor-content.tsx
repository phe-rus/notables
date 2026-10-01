import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cn } from "@notables/ui";
import { FloatingToolbarPlugin } from "../plugins/floating-toolbar/floating-toolbar-plugin";
import { TextChangePlugin } from "../plugins/text-change/text-change-plugin";

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
