import { noteDoc } from "@notables/core";
import { IconButton, MoreIcon, openMenu, PlusIcon, toast } from "@phe-rus/hino";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Y from "yjs";
import { locale, t } from "../../../i18n/i18n";
import { fileNameFor, saveFile } from "../../../platform/save-file";
import { saveNoteContent } from "../../../platform/storage/note-content-cache";
import { previewContent } from "../../library/lib/note-preview";
import { getLibrary, type LibraryEntry } from "../../library/store/library-store";
import { calculateCell, columnName } from "../lib/formulas";

/** Each cell is its own Yjs key, so devices editing different cells merge independently. */
export function SpreadsheetEditor({ doc, entry }: { doc: Y.Doc; entry: LibraryEntry }) {
  const cells = useMemo(() => doc.getMap<string>("spreadsheet:cells"), [doc]);
  const settings = useMemo(() => doc.getMap<number | string>("spreadsheet:settings"), [doc]);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState("A1");
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    cells.observe(changed);
    settings.observe(changed);
    changed();
    return () => {
      cells.unobserve(changed);
      settings.unobserve(changed);
    };
  }, [cells, settings]);
  const values = useMemo(() => {
    void revision;
    return cells.toJSON();
  }, [cells, revision]);
  const rows = Math.max(10, Math.min(500, Number(settings.get("rows")) || 30));
  const columns = Math.max(4, Math.min(52, Number(settings.get("columns")) || 8));
  const currency = String(settings.get("currency") ?? "");
  const formatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(
        locale(),
        currency
          ? { style: "currency", currency, maximumFractionDigits: 2 }
          : { maximumFractionDigits: 8 },
      );
    } catch {
      return new Intl.NumberFormat(locale());
    }
  }, [currency]);
  useEffect(() => {
    const occupied = Object.keys(values).filter((key) => values[key]?.trim());
    const lastRow = Math.max(0, ...occupied.map((key) => Number(key.match(/\d+$/)?.[0]) || 0));
    const lastColumn = Math.max(
      0,
      ...occupied.map((key) =>
        [...key.replace(/\d+$/, "")].reduce(
          (total, letter) => total * 26 + letter.charCodeAt(0) - 64,
          0,
        ),
      ),
    );
    const textNode = (text: string) => ({
      type: "text",
      version: 1,
      text,
      format: 0,
      mode: "normal",
      detail: 0,
      style: "",
    });
    const paragraph = (text: string) => ({
      type: "paragraph",
      version: 1,
      children: [textNode(text)],
      direction: null,
      format: "" as const,
      indent: 0,
    });
    const document = {
      root: {
        type: "root",
        version: 1,
        direction: null,
        format: "" as const,
        indent: 0,
        children: [
          { ...paragraph(entry.title), type: "heading", tag: "h1" },
          {
            type: "table",
            version: 1,
            children: Array.from({ length: Math.min(500, lastRow) }, (_, row) => ({
              type: "tablerow",
              version: 1,
              children: Array.from({ length: Math.min(52, lastColumn) }, (_, column) => {
                const value = calculateCell(`${columnName(column)}${row + 1}`, values);
                return {
                  type: "tablecell",
                  version: 1,
                  colSpan: 1,
                  rowSpan: 1,
                  headerState: 0,
                  children: [
                    paragraph(typeof value === "number" ? formatter.format(value) : value),
                  ],
                };
              }),
            })),
          },
        ],
      },
    };
    void saveNoteContent(entry.id, document);
    getLibrary().update(entry.id, { previewContent: previewContent(document) });
    if (noteDoc.title(doc) !== entry.title) noteDoc.setTitle(doc, entry.title);
  }, [values, entry.title, entry.id, doc, formatter]);
  const write = (key: string, value: string) => {
    if (value.length > 4096) return;
    if (value) cells.set(key, value);
    else cells.delete(key);
    const current = getLibrary().get(entry.id);
    if (current)
      getLibrary().update(entry.id, {
        updatedAt: Date.now(),
        excerpt: Object.entries(cells.toJSON())
          .slice(0, 8)
          .map(([id, text]) => `${id}: ${text}`)
          .join(" · "),
      });
  };
  const display = (key: string) => {
    const value = calculateCell(key, values);
    return typeof value === "number" ? formatter.format(value) : value;
  };
  const exportCsv = async () => {
    const encode = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const content = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column) => {
        const result = String(calculateCell(`${columnName(column)}${row + 1}`, values));
        // CSV consumers may execute leading formula characters. Export calculated values as text.
        return encode(
          /^[=+\-@\t\r]/.test(result) && !/^-?\d+(\.\d+)?$/.test(result) ? `'${result}` : result,
        );
      }).join(","),
    ).join("\r\n");
    try {
      await saveFile(
        new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }),
        fileNameFor(entry.title, "csv"),
        "text/csv",
      );
    } catch {
      toast.error(t("editor.photoFailed"));
    }
  };
  return (
    <section className="flex min-h-0 w-full flex-1 flex-col" aria-label={t("spreadsheet.title")}>
      <div className="flex items-center gap-2 px-3 py-3">
        <input
          aria-label={t("notes.title")}
          value={entry.title}
          placeholder={t("notes.newNote")}
          maxLength={300}
          onChange={(event) =>
            getLibrary().update(entry.id, { title: event.target.value, updatedAt: Date.now() })
          }
          className="min-w-0 flex-1 bg-transparent font-serif text-title2 font-semibold outline-none"
        />
        <IconButton
          label={t("notes.more")}
          size="icon-sm"
          variant="ghost"
          onClick={(event) =>
            openMenu(event.currentTarget, [
              {
                label: t("spreadsheet.addRows"),
                disabled: rows >= 500,
                onSelect: () => settings.set("rows", Math.min(500, rows + 10)),
              },
              {
                label: t("spreadsheet.addColumn"),
                disabled: columns >= 52,
                onSelect: () => settings.set("columns", columns + 1),
              },
              "divider",
              { heading: t("spreadsheet.numberFormat") },
              ...["", "USD", "UGX", "EUR", "GBP", "KES", "TZS"].map((code) => ({
                label: code || t("spreadsheet.number"),
                checked: code === currency,
                onSelect: () => settings.set("currency", code),
              })),
              "divider",
              { label: t("spreadsheet.exportCsv"), onSelect: () => void exportCsv() },
            ])
          }
        >
          <MoreIcon size={20} />
        </IconButton>
      </div>
      <div className="flex items-center gap-3 border-y border-separator px-3 py-2">
        <span className="w-10 shrink-0 font-mono text-caption text-label-secondary">
          {selected}
        </span>
        <label className="font-serif text-label-secondary" htmlFor={`formula-${entry.id}`}>
          ƒx
        </label>
        <input
          id={`formula-${entry.id}`}
          aria-label={t("spreadsheet.formula")}
          value={values[selected] ?? ""}
          onChange={(event) => write(selected, event.target.value)}
          placeholder="=SUM(B2:B10)"
          className="min-w-0 flex-1 bg-transparent font-mono text-callout outline-none"
        />
      </div>
      <div className="max-h-[calc(100dvh-220px)] overflow-auto overscroll-contain">
        <table className="w-max border-collapse text-callout">
          <thead>
            <tr>
              <th className="sticky start-0 top-0 z-20 w-10 bg-sidebar" />
              {Array.from({ length: columns }, (_, column) => (
                <th
                  key={column}
                  className="sticky top-0 z-10 min-w-28 border border-separator bg-sidebar py-2 font-medium text-label-secondary"
                >
                  {columnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                <th className="sticky start-0 z-10 border border-separator bg-sidebar px-2 font-mono text-caption font-normal text-label-secondary">
                  {row + 1}
                </th>
                {Array.from({ length: columns }, (_, column) => {
                  const key = `${columnName(column)}${row + 1}`;
                  return (
                    <td key={key} className="border border-separator p-0">
                      <CellInput
                        address={key}
                        raw={values[key] ?? ""}
                        display={display(key)}
                        className={`h-10 w-28 bg-transparent px-2 outline-none focus:bg-accent-tint ${selected === key ? "ring-2 ring-inset ring-accent" : ""}`}
                        onFocus={() => {
                          setSelected(key);
                        }}
                        onChange={(value) => write(key, value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            const next = document.getElementById(
                              `cell-${entry.id}-${columnName(column)}${Math.min(rows, row + 2)}`,
                            );
                            next?.focus();
                          }
                        }}
                        id={`cell-${entry.id}-${key}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="flex items-center justify-center gap-2 py-3 text-callout text-accent-text disabled:text-label-tertiary"
        disabled={rows >= 500}
        onClick={() => settings.set("rows", Math.min(500, rows + 10))}
      >
        <PlusIcon size={16} />
        {t("spreadsheet.addRows")}
      </button>
    </section>
  );
}

/** Keep native keystrokes in the input while Yjs and totals update around it. */
function CellInput({
  address,
  raw,
  display,
  onFocus,
  onChange,
  ...props
}: {
  address: string;
  raw: string;
  display: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  id: string;
  className: string;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) input.current.value = display;
  }, [display]);
  return (
    <input
      {...props}
      ref={input}
      aria-label={address}
      defaultValue={display}
      onFocus={(event) => {
        event.currentTarget.value = raw;
        onFocus();
      }}
      onBlur={(event) => {
        event.currentTarget.value = display;
      }}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
