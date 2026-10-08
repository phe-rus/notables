import { Popover, SelectorIcon, useDismiss } from "@ultrapeach/ui";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Field, PickerInput, TextInput } from "../../../../components/form/form-fields";
import { t } from "../../../../i18n/i18n";
import { setStructure } from "../../actions/parts";
import {
  entryUnits,
  groupUnits,
  isUnit,
  LABEL_MAX,
  type Structure,
  unitName,
} from "../../model/structure-labels";
import type { BookEntry } from "../../store/book-store";

const CUSTOM = "custom";

/** "Seasons · Episodes": what this item's groups and entries are called, changed in place. */
export function StructureControl({
  book,
  structure,
  fallback,
}: {
  book: BookEntry;
  structure: Structure;
  /** The kind's own words: choosing one of them clears the item's. */
  fallback: Structure;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-footnote font-medium text-accent-text transition-colors hover:bg-accent-soft"
      >
        {unitName(structure.group, true)} · {unitName(structure.entry, true)}
        <SelectorIcon size={14} strokeWidth={2} />
      </button>
      <Popover
        open={open}
        id={panelId}
        role="dialog"
        aria-label={t("books.structure.groups")}
        origin="top-right"
        className="top-[calc(100%+8px)] end-0 flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-3 p-4"
      >
        <LabelPicker
          label={t("books.structure.groups")}
          value={structure.group}
          choices={groupUnits}
          onChange={(group) =>
            setStructure(book.id, { group: group === fallback.group ? "" : group })
          }
        />
        <LabelPicker
          label={t("books.structure.entries")}
          value={structure.entry}
          choices={entryUnits}
          onChange={(entry) =>
            setStructure(book.id, { entry: entry === fallback.entry ? "" : entry })
          }
        />
      </Popover>
    </div>
  );
}

/** A known word from the list, or "Custom…" and a field for one's own. */
function LabelPicker({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: readonly string[];
  onChange: (value: string) => void;
}) {
  const known = isUnit(value) && choices.includes(value);
  const [custom, setCustom] = useState(!known);
  const [draft, setDraft] = useState(known ? "" : value);
  useEffect(() => {
    if (!isUnit(value)) setDraft(value);
  }, [value]);
  return (
    <Field label={label}>
      <PickerInput
        label={label}
        value={custom ? CUSTOM : value}
        onChange={(next) => {
          if (next === CUSTOM) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(next);
        }}
        options={[
          ...choices.map((unit) => ({ value: unit, label: unitName(unit) })),
          { value: CUSTOM, label: t("books.structure.custom") },
        ]}
      />
      {custom && (
        <TextInput
          aria-label={t("books.structure.customName")}
          placeholder={t("books.structure.customName")}
          value={draft}
          maxLength={LABEL_MAX}
          autoFocus={!draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => draft.trim() && onChange(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="mt-1.5"
        />
      )}
    </Field>
  );
}
