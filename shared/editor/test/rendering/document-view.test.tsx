import { describe, expect, it } from "bun:test";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { createEditor } from "lexical";
import { renderToStaticMarkup } from "react-dom/server";
import { editorNodes } from "../../src/nodes/node-registry";
import { markdownTransformers } from "../../src/plugins/markdown/markdown-transformers";
import { DocumentView } from "../../src/rendering/document-view";

function serialize(markdown: string) {
  const editor = createEditor({
    namespace: "t",
    nodes: editorNodes,
    onError: (e) => {
      throw e;
    },
  });
  editor.update(() => $convertFromMarkdownString(markdown, markdownTransformers), {
    discrete: true,
  });
  return editor.getEditorState().toJSON();
}

describe("DocumentView", () => {
  it("renders rich blocks and formats on the server", () => {
    const html = renderToStaticMarkup(
      <DocumentView
        document={serialize(
          "# Night train\n\nThe **carriage** smelled of ==oranges==.\n\n- [x] Pack\n- [ ] Write\n\n> hum",
        )}
      />,
    );
    expect(html).toContain('<h1 class="nt-h1">');
    expect(html).toContain('<strong class="nt-bold">carriage</strong>');
    expect(html).toContain('<mark class="nt-highlight">oranges</mark>');
    expect(html).toContain('class="nt-li-checked"');
    expect(html).toContain('<blockquote class="nt-quote">');
  });

  it("drops unsafe links and media and unknown nodes", () => {
    const document = {
      root: {
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "javascript:alert(1)",
                children: [{ type: "text", text: "x", format: 0 }],
              },
            ],
          },
          { type: "image", src: "javascript:alert(1)", alt: "" },
          { type: "image", src: "data:text/html;base64,PHNjcmlwdD4=", alt: "" },
          { type: "script", children: [] },
        ],
      },
    };
    const html = renderToStaticMarkup(<DocumentView document={document} />);
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
  });

  it("allows same-origin media paths but not protocol-relative URLs", () => {
    const html = renderToStaticMarkup(
      <DocumentView
        document={{
          root: {
            children: [
              { type: "image", src: "/media/p1/m1", alt: "kept" },
              { type: "image", src: "//evil.test/x.png", alt: "dropped" },
            ],
          },
        }}
      />,
    );
    expect(html).toContain('src="/media/p1/m1"');
    expect(html).not.toContain("evil.test");
  });

  it("tolerates malformed input", () => {
    expect(renderToStaticMarkup(<DocumentView document={null} />)).toBe(
      '<div class="nt-content nt-readonly"></div>',
    );
  });
});
