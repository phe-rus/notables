import type { InvoiceFont, InvoiceLayout, InvoiceStyle } from "@notables/core";
import { useMediaSource } from "@notables/pluraliti";
import { PhotoIcon, SegmentedControl, SwatchPicker } from "@ultrapeach/ui";
import { useRef } from "react";
import { deleteMedia, saveMedia } from "../../../platform/storage/media-store";

const accents = [
  { value: "#E39A2E", label: "Honey" },
  { value: "#1F1D1A", label: "Ink" },
  { value: "#2C6193", label: "Ocean" },
  { value: "#46653B", label: "Sage" },
  { value: "#6B4FA8", label: "Plum" },
  { value: "#B4405A", label: "Rose" },
];

/** How the document looks: accent, layout, typeface and logo. */
export function StylePanel({
  style,
  onChange,
}: {
  style: InvoiceStyle;
  onChange: (style: InvoiceStyle) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const logoSrc = useMediaSource(style.logo ?? "");
  const custom = !accents.some(
    (accent) => accent.value.toLowerCase() === style.accent.toLowerCase(),
  );

  const chooseLogo = async (file: File | undefined) => {
    if (!file) return;
    const previous = style.logo;
    const id = await saveMedia(file);
    onChange({ ...style, logo: `media:${id}` });
    if (previous?.startsWith("media:")) void deleteMedia(previous.slice(6));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <span className="text-caption font-medium text-label-secondary">Accent</span>
        <div className="flex items-start gap-3">
          <SwatchPicker
            label="Document accent"
            value={custom ? "" : style.accent.toUpperCase()}
            onChange={(accent) => onChange({ ...style, accent })}
            options={accents.map((accent) => ({ ...accent, color: accent.value, ink: "#fff" }))}
          />
          <label
            className="group flex cursor-pointer flex-col items-center gap-1.5"
            data-tooltip="Custom colour"
          >
            <span
              className="relative flex size-8 items-center justify-center overflow-hidden rounded-full ring-offset-2 ring-offset-elevated"
              style={{
                background: custom
                  ? style.accent
                  : "conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)",
                boxShadow: custom ? "0 0 0 2px var(--color-label)" : undefined,
              }}
            >
              <input
                type="color"
                value={style.accent}
                onChange={(event) => onChange({ ...style, accent: event.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Custom accent colour"
              />
            </span>
            <span className="text-caption2 text-label-tertiary">Custom</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-caption font-medium text-label-secondary">Layout</span>
        <SegmentedControl<InvoiceLayout>
          label="Layout"
          value={style.layout}
          onChange={(layout) => onChange({ ...style, layout })}
          options={[
            { value: "modern", label: "Modern" },
            { value: "classic", label: "Classic" },
            { value: "minimal", label: "Minimal" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-caption font-medium text-label-secondary">Typeface</span>
        <SegmentedControl<InvoiceFont>
          label="Typeface"
          value={style.font}
          onChange={(font) => onChange({ ...style, font })}
          options={[
            { value: "sans", label: "Sans" },
            { value: "serif", label: "Serif" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-caption font-medium text-label-secondary">Logo</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-separator bg-fill/50 text-label-tertiary transition-colors hover:bg-fill"
            aria-label={style.logo ? "Change logo" : "Add logo"}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="" className="max-h-full max-w-full object-contain p-1.5" />
            ) : (
              <PhotoIcon size={20} />
            )}
          </button>
          {style.logo && (
            <button
              type="button"
              onClick={() => {
                const previous = style.logo;
                onChange({ ...style, logo: null });
                if (previous?.startsWith("media:")) void deleteMedia(previous.slice(6));
              }}
              className="text-footnote font-medium text-danger"
            >
              Remove
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => void chooseLogo(event.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
