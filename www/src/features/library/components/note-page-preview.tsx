import { useMediaSource } from "@notables/pluraliti";
import { CheckIcon, cn } from "@phe-rus/hino";
import type { NotePreviewBlock } from "../model/note-preview";
import type { LibraryEntry } from "../store/library-store";

/** A small page made from indexed content, without opening an editor for every card. */
export function NotePagePreview({ entry }: { entry: LibraryEntry }) {
  const blocks: NotePreviewBlock[] = entry.previewContent?.length
    ? entry.previewContent
    : [
        ...(entry.title ? [{ kind: "heading" as const, text: entry.title, level: 1 }] : []),
        ...(entry.excerpt ? [{ kind: "paragraph" as const, text: entry.excerpt }] : []),
        ...(entry.previewImage
          ? [{ kind: "image" as const, src: entry.previewImage, width: 100 }]
          : []),
      ];
  return (
    <div
      aria-hidden="true"
      className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-lg border border-separator bg-paper text-left text-label"
    >
      <div className="w-[250%] origin-top-left scale-[0.4] p-5 text-footnote leading-snug">
        {blocks.map((block, index) => {
          const key = `${block.kind}-${index}`;
          if (block.kind === "image")
            return <PreviewImage key={key} src={block.src} width={block.width} />;
          if (block.kind === "table")
            return (
              <table key={key} className="my-2 w-full table-fixed border-collapse text-caption">
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={`${key}-${r}`}>
                      {row.map((cell, c) => (
                        <td
                          key={`${key}-${r}-${c}`}
                          className="truncate border border-separator p-1"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          if (block.kind === "heading")
            return (
              <p
                key={key}
                className={cn(
                  "mb-2 font-semibold",
                  block.level === 1 ? "text-title3" : "text-subheadline",
                )}
              >
                {block.text}
              </p>
            );
          if (block.kind === "check" || block.kind === "bullet")
            return (
              <p key={key} className="mb-1 flex items-start gap-2">
                {block.kind === "check" ? (
                  <span
                    className={cn(
                      "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                      block.checked
                        ? "border-accent bg-accent text-on-accent"
                        : "border-label-tertiary",
                    )}
                  >
                    {block.checked && <CheckIcon size={10} />}
                  </span>
                ) : (
                  <span>•</span>
                )}
                <span>{block.text}</span>
              </p>
            );
          return (
            <p key={key} className="mb-2 whitespace-pre-wrap break-words">
              {block.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function PreviewImage({ src, width }: { src: string; width: number }) {
  const resolved = useMediaSource(src);
  return resolved ? (
    <span className="inline-block px-0.5 align-top" style={{ width: `${width}%` }}>
      <img
        src={resolved}
        alt=""
        loading="lazy"
        className="my-1 aspect-video w-full rounded-sm object-cover"
      />
    </span>
  ) : null;
}
