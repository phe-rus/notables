import { createBinding, syncYjsChangesToLexical } from "@lexical/yjs";
import { createEditor, type SerializedEditorState } from "lexical";
import * as Y from "yjs";
import { offlineProvider } from "../collaboration/offline-provider";
import { editorNodes } from "../nodes/node-registry";

/** Renders synced content without bootstrapping or changing its source document. */
export function readDocument(source: Y.Doc): SerializedEditorState | null {
  const replica = new Y.Doc();
  const editor = createEditor({
    namespace: "notables:read",
    nodes: editorNodes,
    onError(error) {
      throw error;
    },
  });
  const provider = offlineProvider();
  const id = "read";
  const binding = createBinding(editor, provider, id, replica, new Map([[id, replica]]));
  const root = binding.root.getSharedType();
  const sync: Parameters<typeof root.observeDeep>[0] = (events) => {
    syncYjsChangesToLexical(binding, provider, events, false);
  };
  root.observeDeep(sync);
  try {
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(source));
    editor.update(() => {}, { discrete: true });
    const document = editor.getEditorState().toJSON();
    return document.root.children.length ? document : null;
  } finally {
    root.unobserveDeep(sync);
    binding.root.destroy(binding);
    replica.destroy();
  }
}
