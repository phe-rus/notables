import type { EditorThemeClasses } from "lexical";

/** Class names for every node and format; styled in `editor.css`. */
export const editorTheme: EditorThemeClasses = {
  root: "nt-editor",
  paragraph: "nt-p",
  heading: { h1: "nt-h1", h2: "nt-h2", h3: "nt-h3" },
  quote: "nt-quote",
  code: "nt-code-block",
  link: "nt-link",
  hr: "nt-hr",
  table: "nt-table",
  tableCell: "nt-table-cell",
  tableCellHeader: "nt-table-header",
  tableRow: "nt-table-row",
  list: {
    ul: "nt-ul",
    ol: "nt-ol",
    checklist: "nt-checklist",
    listitem: "nt-li",
    listitemChecked: "nt-li-checked",
    listitemUnchecked: "nt-li-unchecked",
    nested: { listitem: "nt-li-nested" },
  },
  text: {
    bold: "nt-bold",
    italic: "nt-italic",
    underline: "nt-underline",
    strikethrough: "nt-strike",
    underlineStrikethrough: "nt-underline nt-strike",
    code: "nt-code",
    highlight: "nt-highlight",
    subscript: "nt-subscript",
    superscript: "nt-superscript",
  },
};
