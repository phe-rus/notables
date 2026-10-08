import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { DrawIcon } from "@ultrapeach/ui";
import { $getNodeByKey, type NodeKey } from "lexical";
import { useDrawingStudio } from "../../media/drawing-studio";
import { $isImageNode } from "./image-node";

/** Reopens a drawn page in the studio and swaps in the new version. */
export function RedrawButton({ nodeKey, scene }: { nodeKey: NodeKey; scene: string }) {
  const [editor] = useLexicalComposerContext();
  const editable = useLexicalEditable();
  const studio = useDrawingStudio();
  if (!studio || !editable) return null;
  return (
    <button
      type="button"
      className="nt-redraw"
      onClick={async () => {
        const drawing = await studio.open(scene);
        if (!drawing) return;
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) node.setDrawing(drawing.src, drawing.scene);
        });
      }}
    >
      <DrawIcon size={15} />
      Edit page
    </button>
  );
}
