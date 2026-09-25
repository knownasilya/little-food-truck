import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [tailwindcss(), sveltekit()],

  // Vite's dep optimizer pre-bundles maplibre-gl's main thread code but
  // misses its worker chunk (maplibre-gl-worker.mjs), which 404s at
  // runtime — breaking anything that needs the worker (e.g. clustering on
  // a GeoJSON source, which never finishes loading without it). Excluding
  // the package from pre-bundling avoids the broken split.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
