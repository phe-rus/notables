import { describe, expect, it } from "bun:test";
import { createBinding, type Provider, syncYjsChangesToLexical } from "@lexical/yjs";
import { createEditor } from "lexical";
import * as Y from "yjs";
import { composeDocumentFromMarkdown, editorNodes } from "../../src/index";

const provider = {
  awareness: {
    getLocalState: () => null,
    getStates: () => new Map(),
    off: () => {},
    on: () => {},
    setLocalState: () => {},
    setLocalStateField: () => {},
  },
  connect: () => {},
  disconnect: () => {},
  off: () => {},
  on: () => {},
} as unknown as Provider;

const markdown = [
  "# Welcome to Notables",
  "",
  "Everything stays **on this device**.",
  "",
  "- [ ] Write a note",
  "- [x] Open Notables",
  "",
  "> A quote worth keeping",
].join("\n");

describe("composeDocumentFromMarkdown", () => {
  it("renders the title, formatting, checklists and quotes", () => {
    const json = composeDocumentFromMarkdown(new Y.Doc(), markdown);
    const types = json.root.children.map((node) => node.type);
    expect(types).toEqual(["heading", "paragraph", "list", "quote"]);
    expect(JSON.stringify(json)).toContain("on this device");
  });

  it("stores content the collaborative editor reads back identically", () => {
    const source = new Y.Doc();
    const composed = composeDocumentFromMarkdown(source, markdown);

    const replica = new Y.Doc();
    const editor = createEditor({
      namespace: "replica",
      nodes: editorNodes,
      onError: (e) => {
        throw e;
      },
    });
    const binding = createBinding(
      editor,
      provider,
      "replica",
      replica,
      new Map([["replica", replica]]),
    );
    binding.root.getSharedType().observeDeep((events) => {
      syncYjsChangesToLexical(binding, provider, events as never, false);
    });
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(source));
    editor.update(() => {}, { discrete: true });

    // Node state ("$", e.g. the Markdown list marker) is metadata, not content.
    const content = (state: unknown) =>
      JSON.parse(JSON.stringify(state, (key, value) => (key === "$" ? undefined : value)));
    expect(content(editor.getEditorState().toJSON())).toEqual(content(composed));
  });
});
