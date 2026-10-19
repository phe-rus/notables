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

const COLUMN = { size: 112, min: 48, max: 480 };
const ROW = { size: 40, min: 28, max: 240 };

/** A column or row being resized, shown live and saved when let go. */
interface Resize {
  kind: "width" | "height";
  index: number;
  size: number;
}

/** Each cell is its own Yjs key, so devices editing different cells merge independently. */
export function SpreadsheetEditor({
  doc,
  entry,
  projection,
}: {
  doc: Y.Doc;
  entry: LibraryEntry;
  projection?: { cells: Record<string, string>; rows: number; csv: string };
}) {
  const cells = useMemo(() => doc.getMap<string>("spreadsheet:cells"), [doc]);
  const settings = useMemo(() => doc.getMap<number | string>("spreadsheet:settings"), [doc]);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState("A1");
  const [resize, setResize] = useState<Resize | null>(null);
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
    return projection?.cells ?? cells.toJSON();
  }, [cells, revision, projection]);
  const rows = Math.max(10, projection?.rows ?? Math.min(500, Number(settings.get("rows")) || 30));
  const columns = Math.max(4, projection ? 6 : Math.min(52, Number(settings.get("columns")) || 8));
  const currency = String(settings.get("currency") ?? "");
  // Sizes live in the synced settings, so a column keeps its width on every device.
  const sizeOf = (kind: Resize["kind"], index: number) => {
    if (resize?.kind === kind && resize.index === index) return resize.size;
    const limits = kind === "width" ? COLUMN : ROW;
    const stored = Number(settings.get(`${kind}:${index}`));
    return stored ? Math.min(limits.max, Math.max(limits.min, stored)) : limits.size;
  };
  const startResize = (kind: Resize["kind"], index: number, event: React.PointerEvent) => {
    event.preventDefault();
    const limits = kind === "width" ? COLUMN : ROW;
    const origin = kind === "width" ? event.clientX : event.clientY;
    const start = sizeOf(kind, index);
    // Right to left, a column grows as the pointer moves left.
    const direction =
      kind === "width" && getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
    let size = start;
    const move = (moved: PointerEvent) => {
      const delta = ((kind === "width" ? moved.clientX : moved.clientY) - origin) * direction;
      size = Math.round(Math.min(limits.max, Math.max(limits.min, start + delta)));
      setResize({ kind, index, size });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (size !== start) settings.set(`${kind}:${index}`, size);
      setResize(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };
  const resetSize = (kind: Resize["kind"], index: number) => settings.delete(`${kind}:${index}`);
  const focusCell = (column: number, row: number) => {
    if (column < 0 || row < 0 || column >= columns || row >= rows) return;
    document.getElementById(`cell-${entry.id}-${columnName(column)}${row + 1}`)?.focus();
  };
  const selectedColumn = selected.replace(/\d+$/, "");
  const selectedRow = Number(selected.match(/\d+$/)?.[0]) - 1;
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
                const key = `${columnName(column)}${row + 1}`;
                const value = projection ? (values[key] ?? "") : calculateCell(key, values);
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
  }, [values, entry.title, entry.id, doc, formatter, projection]);
  const write = (key: string, value: string) => {
    if (projection || value.length > 4096) return;
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
    if (projection) return values[key] ?? "";
    const value = calculateCell(key, values);
    return typeof value === "number" ? formatter.format(value) : value;
  };
  const numeric = (key: string) =>
    projection ? /^F\d+$/.test(key) : typeof calculateCell(key, values) === "number";
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
        new Blob(["\ufeff", projection?.csv ?? content], { type: "text/csv;charset=utf-8" }),
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
            openMenu(
              event.currentTarget,
              projection
                ? [{ label: t("spreadsheet.exportCsv"), onSelect: () => void exportCsv() }]
                : [
                    {
                      label: t("spreadsheet.addRows"),
                      disabled: Boolean(projection) || rows >= 500,
                      onSelect: () => settings.set("rows", Math.min(500, rows + 10)),
                    },
                    {
                      label: t("spreadsheet.addColumn"),
                      disabled: Boolean(projection) || columns >= 52,
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
                  ],
            )
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
          readOnly={Boolean(projection)}
          id={`formula-${entry.id}`}
          aria-label={t("spreadsheet.formula")}
          value={values[selected] ?? ""}
          onChange={(event) => write(selected, event.target.value)}
          placeholder="=SUM(B2:B10)"
          className="min-w-0 flex-1 bg-transparent font-mono text-callout outline-none"
        />
      </div>
      <div className="max-h-[calc(100dvh-220px)] overflow-auto overscroll-contain">
        <table className="w-max table-fixed border-collapse text-callout">
          <colgroup>
            <col style={{ width: 40 }} />
            {Array.from({ length: columns }, (_, column) => (
              <col key={column} style={{ width: sizeOf("width", column) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky start-0 top-0 z-20 bg-sidebar" />
              {Array.from({ length: columns }, (_, column) => (
                <th
                  key={column}
                  className={`sticky top-0 z-10 border border-separator py-2 font-medium ${
                    selectedColumn === columnName(column)
                      ? "bg-accent-tint text-accent-text"
                      : "bg-sidebar text-label-secondary"
                  }`}
                >
                  {columnName(column)}
                  <ResizeHandle
                    kind="width"
                    label={t("spreadsheet.resizeColumn", { name: columnName(column) })}
                    active={resize?.kind === "width" && resize.index === column}
                    onPointerDown={(event) => startResize("width", column, event)}
                    onReset={() => resetSize("width", column)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row} style={{ height: sizeOf("height", row) }}>
                <th
                  className={`sticky start-0 z-10 border border-separator px-2 font-mono text-caption font-normal ${
                    selectedRow === row
                      ? "bg-accent-tint text-accent-text"
                      : "bg-sidebar text-label-secondary"
                  }`}
                >
                  {row + 1}
                  <ResizeHandle
                    kind="height"
                    label={t("spreadsheet.resizeRow", { name: String(row + 1) })}
                    active={resize?.kind === "height" && resize.index === row}
                    onPointerDown={(event) => startResize("height", row, event)}
                    onReset={() => resetSize("height", row)}
                  />
                </th>
                {Array.from({ length: columns }, (_, column) => {
                  const key = `${columnName(column)}${row + 1}`;
                  return (
                    <td key={key} className="border border-separator p-0">
                      <CellInput
                        readOnly={Boolean(projection)}
                        address={key}
                        raw={values[key] ?? ""}
                        display={display(key)}
                        className={`block size-full bg-transparent px-2 outline-none focus:bg-accent-tint focus:text-start ${
                          numeric(key) ? "text-end tabular-nums" : ""
                        } ${selected === key ? "ring-2 ring-inset ring-accent" : ""}`}
                        onFocus={() => {
                          setSelected(key);
                        }}
                        onChange={(value) => write(key, value)}
                        onKeyDown={(event) => {
                          const input = event.currentTarget;
                          const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
                          const atEnd = input.selectionStart === input.value.length;
                          const rtl = getComputedStyle(input).direction === "rtl";
                          const step: [number, number] | null =
                            event.key === "Enter"
                              ? [0, event.shiftKey ? -1 : 1]
                              : event.key === "ArrowDown"
                                ? [0, 1]
                                : event.key === "ArrowUp"
                                  ? [0, -1]
                                  : event.key === "ArrowRight" && (rtl ? atStart : atEnd)
                                    ? [rtl ? -1 : 1, 0]
                                    : event.key === "ArrowLeft" && (rtl ? atEnd : atStart)
                                      ? [rtl ? 1 : -1, 0]
                                      : null;
                          if (!step) return;
                          event.preventDefault();
                          focusCell(column + step[0], row + step[1]);
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
      {!projection && (
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-3 text-callout text-accent-text disabled:text-label-tertiary"
          disabled={Boolean(projection) || rows >= 500}
          onClick={() => settings.set("rows", Math.min(500, rows + 10))}
        >
          <PlusIcon size={16} />
          {t("spreadsheet.addRows")}
        </button>
      )}
    </section>
  );
}

/** The edge of a column or row header: drag to resize, double-click to reset. */
function ResizeHandle({
  kind,
  label,
  active,
  onPointerDown,
  onReset,
}: {
  kind: Resize["kind"];
  label: string;
  active: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  onReset: () => void;
}) {
  return (
    <hr
      aria-label={label}
      aria-orientation={kind === "width" ? "vertical" : "horizontal"}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      className={`absolute z-10 m-0 touch-none border-0 select-none after:absolute after:bg-accent after:opacity-0 hover:after:opacity-100 ${
        active ? "after:opacity-100" : ""
      } ${
        kind === "width"
          ? "inset-y-0 -end-1.5 w-3 cursor-col-resize after:inset-y-0 after:start-1/2 after:w-0.5 after:-translate-x-1/2"
          : "inset-x-0 -bottom-1.5 h-3 cursor-row-resize after:inset-x-0 after:top-1/2 after:h-0.5 after:-translate-y-1/2"
      }`}
    />
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
  readOnly?: boolean;
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
