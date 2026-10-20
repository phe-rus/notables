import { Button, Sheet } from "@phe-rus/hino";
import { useEffect, useState } from "react";
import { getLibrary, type LibraryEntry, useLibrary } from "@/features/library/store/library-store";
import { t } from "@/i18n/i18n";

export function NoteTagsSheet({
  entry,
  open,
  onClose,
}: {
  entry: LibraryEntry;
  open: boolean;
  onClose: () => void;
}) {
  const library = useLibrary();
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) setText((entry.manualTags ?? []).join(", "));
  }, [open, entry.id]);
  const tags = [
    ...new Set(
      text
        .split(/[,;\s]+/)
        .map((value) => value.replace(/^#/, "").normalize("NFKC"))
        .filter((value) => /^[\p{L}\p{N}_][\p{L}\p{M}\p{N}_-]{0,39}$/u.test(value)),
    ),
  ].slice(0, 30);
  const suggestions = [...new Set(library.flatMap((note) => note.tags ?? []))].sort().slice(0, 16);
  return (
    <Sheet open={open} onClose={onClose} label={t("workspace.tags")} className="max-w-[480px]">
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const automatic = (entry.tags ?? []).filter((tag) => !entry.manualTags?.includes(tag));
          getLibrary().update(entry.id, {
            manualTags: tags,
            tags: [...new Set([...tags, ...automatic])].slice(0, 30),
          });
          onClose();
        }}
      >
        <h2 className="text-title3 font-semibold">{t("workspace.tags")}</h2>
        <input
          aria-label={t("workspace.tags")}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={1200}
          autoCapitalize="none"
          autoCorrect="off"
          className="rounded-xl control-field px-3 py-3 text-body"
        />
        <p className="text-footnote text-label-secondary">{t("workspace.tagsHint")}</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={tags.includes(tag)}
              className={`rounded-full px-3 py-1.5 text-footnote ${tags.includes(tag) ? "bg-accent text-on-accent" : "bg-fill text-label"}`}
              onClick={() =>
                setText(
                  (tags.includes(tag)
                    ? tags.filter((value) => value !== tag)
                    : [...tags, tag]
                  ).join(", "),
                )
              }
            >
              #{tag}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">{t("common.done")}</Button>
        </div>
      </form>
    </Sheet>
  );
}
