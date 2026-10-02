import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * One app, two targets. The Tauri CLI sets TAURI_ENV_PLATFORM: then www is
 * built as a static single-page app for the native shell. Otherwise it is
 * built for Cloudflare Workers with server rendering.
 */
const tauri = Boolean(process.env.TAURI_ENV_PLATFORM);

export default defineConfig({
  clearScreen: false,
  resolve: {
    // One copy of each, or Yjs’s constructor checks and Lexical’s node registry break.
    dedupe: ["yjs", "lexical"],
    // Server functions run on the deployed Worker, never inside the app.
    alias: tauri
      ? {
          "cloudflare:workers": fileURLToPath(
            new URL("./src/server/native-shell-env.ts", import.meta.url),
          ),
        }
      : {},
  },
  optimizeDeps: {
    // Pre-bundle the whole Lexical and Yjs family in one pass. Discovering
    // one of them later re-bundles it on its own, and an open page then holds
    // two copies ("…is not a constructor that subclasses LexicalNode").
    // Lexical and the y-* bindings are dependencies of the workspace packages,
    // so name the package that brings each one in.
    include: [
      "@notables/editor > @lexical/code",
      "@notables/editor > @lexical/link",
      "@notables/editor > @lexical/list",
      "@notables/editor > @lexical/markdown",
      "@notables/editor > @lexical/react/LexicalCheckListPlugin",
      "@notables/editor > @lexical/react/LexicalClickableLinkPlugin",
      "@notables/editor > @lexical/react/LexicalCollaborationContext",
      "@notables/editor > @lexical/react/LexicalCollaborationPlugin",
      "@notables/editor > @lexical/react/LexicalComposer",
      "@notables/editor > @lexical/react/LexicalComposerContext",
      "@notables/editor > @lexical/react/LexicalContentEditable",
      "@notables/editor > @lexical/react/LexicalErrorBoundary",
      "@notables/editor > @lexical/react/LexicalHistoryPlugin",
      "@notables/editor > @lexical/react/LexicalHorizontalRuleNode",
      "@notables/editor > @lexical/react/LexicalHorizontalRulePlugin",
      "@notables/editor > @lexical/react/LexicalLinkPlugin",
      "@notables/editor > @lexical/react/LexicalListPlugin",
      "@notables/editor > @lexical/react/LexicalMarkdownShortcutPlugin",
      "@notables/editor > @lexical/react/LexicalRichTextPlugin",
      "@notables/editor > @lexical/react/LexicalTabIndentationPlugin",
      "@notables/editor > @lexical/react/useLexicalEditable",
      "@notables/editor > @lexical/rich-text",
      "@notables/editor > @lexical/selection",
      "@notables/editor > @lexical/utils",
      "@notables/editor > @lexical/yjs",
      "@notables/editor > lexical",
      "@notables/editor > perfect-freehand",
      "@notables/sync > y-indexeddb",
      "@notables/sync > y-partyserver/provider",
      "@notables/sync > y-protocols/awareness",
      "yjs",
      // Loaded on demand by the importers; bundled up front so the first
      // import doesn't reload the page in development.
      "@anthropic-ai/sdk",
      "fflate",
      "pdfjs-dist/legacy/build/pdf.mjs",
    ],
  },
  server: {
    // Tauri mobile dev connects to the host machine over the network.
    host: process.env.TAURI_DEV_HOST || false,
    strictPort: true,
  },
  plugins: [
    ...(tauri ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    tailwindcss(),
    tanstackStart(
      tauri ? { spa: { enabled: true, prerender: { outputPath: "/index.html" } } } : undefined,
    ),
    react(),
  ],
});
