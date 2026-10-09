import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { walletOcrAssets } from "./wallet-ocr-assets";

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
      "@notables/pluraliti > @lexical/code",
      "@notables/pluraliti > @lexical/link",
      "@notables/pluraliti > @lexical/list",
      "@notables/pluraliti > @lexical/markdown",
      "@notables/pluraliti > @lexical/react/LexicalCheckListPlugin",
      "@notables/pluraliti > @lexical/react/LexicalClickableLinkPlugin",
      "@notables/pluraliti > @lexical/react/LexicalCollaborationContext",
      "@notables/pluraliti > @lexical/react/LexicalCollaborationPlugin",
      "@notables/pluraliti > @lexical/react/LexicalComposer",
      "@notables/pluraliti > @lexical/react/LexicalComposerContext",
      "@notables/pluraliti > @lexical/react/LexicalContentEditable",
      "@notables/pluraliti > @lexical/react/LexicalErrorBoundary",
      "@notables/pluraliti > @lexical/react/LexicalHistoryPlugin",
      "@notables/pluraliti > @lexical/react/LexicalHorizontalRuleNode",
      "@notables/pluraliti > @lexical/react/LexicalHorizontalRulePlugin",
      "@notables/pluraliti > @lexical/react/LexicalLinkPlugin",
      "@notables/pluraliti > @lexical/react/LexicalListPlugin",
      "@notables/pluraliti > @lexical/react/LexicalMarkdownShortcutPlugin",
      "@notables/pluraliti > @lexical/react/LexicalRichTextPlugin",
      "@notables/pluraliti > @lexical/react/LexicalTabIndentationPlugin",
      "@notables/pluraliti > @lexical/react/useLexicalEditable",
      "@notables/pluraliti > @lexical/rich-text",
      "@notables/pluraliti > @lexical/selection",
      "@notables/pluraliti > @lexical/utils",
      "@notables/pluraliti > @lexical/yjs",
      "@notables/pluraliti > lexical",
      "@notables/pluraliti > perfect-freehand",
      "@notables/sync > y-indexeddb",
      "@notables/sync > y-partyserver/provider",
      "@notables/sync > y-protocols/awareness",
      "@notables/sync > y-protocols/sync",
      "@notables/sync > lib0/decoding",
      "@notables/sync > lib0/encoding",
      "yjs",
      // Loaded on demand by the importers; bundled up front so the first
      // import doesn't reload the page in development.
      "@anthropic-ai/sdk",
      "@tauri-apps/plugin-deep-link",
      "@tauri-apps/api/app",
      "@tauri-apps/api/core",
      "@tauri-apps/api/event",
      "@tauri-apps/plugin-notification",
      "date-holidays",
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
    walletOcrAssets(tauri),
    ...(tauri ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    tailwindcss(),
    tanstackStart(
      tauri ? { spa: { enabled: true, prerender: { outputPath: "/index.html" } } } : undefined,
    ),
    react(),
  ],
});
