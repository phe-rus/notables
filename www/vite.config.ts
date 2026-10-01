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
  build: {
    // Server functions run on the deployed Worker, never inside the app bundle.
    rollupOptions: { external: tauri ? ["cloudflare:workers"] : [] },
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
