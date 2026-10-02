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
    include: [
      "@lexical/code",
      "@lexical/link",
      "@lexical/list",
      "@lexical/markdown",
      "@lexical/react/LexicalCheckListPlugin",
      "@lexical/react/LexicalClickableLinkPlugin",
      "@lexical/react/LexicalCollaborationContext",
      "@lexical/react/LexicalCollaborationPlugin",
      "@lexical/react/LexicalComposer",
      "@lexical/react/LexicalComposerContext",
      "@lexical/react/LexicalContentEditable",
      "@lexical/react/LexicalErrorBoundary",
      "@lexical/react/LexicalHistoryPlugin",
      "@lexical/react/LexicalHorizontalRuleNode",
      "@lexical/react/LexicalHorizontalRulePlugin",
      "@lexical/react/LexicalLinkPlugin",
      "@lexical/react/LexicalListPlugin",
      "@lexical/react/LexicalMarkdownShortcutPlugin",
      "@lexical/react/LexicalRichTextPlugin",
      "@lexical/react/LexicalTabIndentationPlugin",
      "@lexical/rich-text",
      "@lexical/selection",
      "@lexical/utils",
      "@lexical/yjs",
      "lexical",
      "y-indexeddb",
      "y-partyserver/provider",
      "y-protocols/awareness",
      "yjs",
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
