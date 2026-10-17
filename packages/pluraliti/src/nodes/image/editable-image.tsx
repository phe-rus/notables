import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { IconButton, MoreIcon, openMenu, toast } from "@phe-rus/hino";
import { $getNodeByKey, type NodeKey } from "lexical";
import { useRef } from "react";
import { useEditorTools } from "../../media/editor-tools";
import { MediaImage } from "../../media/media-image";
import { $isImageNode, type ImageLayout } from "./image-node";

export function EditableImage({
  nodeKey,
  src,
  alt,
  layout,
  scene,
}: {
  nodeKey: NodeKey;
  src: string;
  alt: string;
  layout: ImageLayout;
  scene: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const editable = useLexicalEditable();
  const tools = useEditorTools();
  const file = useRef<HTMLInputElement>(null);
  const { labels } = tools;
  const change = (action: (node: NonNullable<ReturnType<typeof $getNodeByKey>>) => void) => {
    tools.onEdit?.();
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) action(node);
    });
  };
  return (
    <div className="group relative w-full">
      <MediaImage
        src={src}
        alt={alt}
        style={
          scene
            ? undefined
            : {
                aspectRatio: layout.aspect === "original" ? undefined : layout.aspect,
                objectFit: layout.fit,
                objectPosition: `50% ${layout.position}%`,
                maxHeight: "none",
              }
        }
      />
      {(editable || tools.onEdit) && (
        <IconButton
          size="icon-sm"
          variant="secondary"
          label={labels.imageOptions}
          className="absolute end-2 top-2"
          onClick={(event) =>
            openMenu(
              event.currentTarget,
              [
                { label: labels.replacePhoto, onSelect: () => file.current?.click() },
                ...([100, 75, 50, 25] as const).map((width) => ({
                  label: `${labels.imageSize} ${width}%`,
                  checked: layout.width === width,
                  onSelect: () =>
                    change((node) => {
                      if ($isImageNode(node)) node.setLayout({ width });
                    }),
                })),
                "divider",
                ...(["16 / 9", "4 / 3", "1 / 1", "original"] as const).map((aspect) => ({
                  label:
                    aspect === "original"
                      ? labels.original
                      : `${labels.crop} ${aspect.replaceAll(" ", "")}`,
                  checked: layout.aspect === aspect,
                  onSelect: () =>
                    change((node) => {
                      if ($isImageNode(node)) node.setLayout({ aspect });
                    }),
                })),
                {
                  label: labels.fit,
                  checked: layout.fit === "contain",
                  onSelect: () =>
                    change((node) => {
                      if ($isImageNode(node))
                        node.setLayout({ fit: layout.fit === "contain" ? "cover" : "contain" });
                    }),
                },
                {
                  label: labels.moveUp,
                  onSelect: () =>
                    change((node) => {
                      const previous = node.getPreviousSibling();
                      if (previous) previous.insertBefore(node);
                    }),
                },
                {
                  label: labels.moveDown,
                  onSelect: () =>
                    change((node) => {
                      const next = node.getNextSibling();
                      if (next) next.insertAfter(node);
                    }),
                },
                {
                  label: labels.removePhoto,
                  destructive: true,
                  onSelect: () => change((node) => node.remove()),
                },
              ],
              { edge: "trailing" },
            )
          }
        >
          <MoreIcon size={17} />
        </IconButton>
      )}
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={async (event) => {
          const photo = event.target.files?.[0];
          event.target.value = "";
          if (!photo || !tools.resolvePhoto) return;
          try {
            const next = await tools.resolvePhoto(photo);
            change((node) => {
              if ($isImageNode(node)) node.setDrawing(next, "");
            });
          } catch {
            toast.error(labels.photoFailed);
          }
        }}
      />
    </div>
  );
}
