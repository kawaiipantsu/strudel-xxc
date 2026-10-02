import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "strudel-webkit-output-fallback",
      transform(code, id) {
        if (id.endsWith("/@strudel/midi/dist/index.mjs")) {
          // Published 1.3.0 inlines a second, suspended AudioContext in MIDI timers.
          // Use the package's already-imported official shared context instead.
          const needle = "ee = () => j || be()";
          if (!code.includes(needle) || !code.includes("getAudioContext as he"))
            throw new Error(
              "Review the pinned Strudel MIDI context compatibility transform.",
            );
          return code.replace(needle, "ee = () => he()");
        }
        if (id.endsWith("/superdough/dist/index.mjs"))
          return code
            .replace(
              /([a-zA-Z_$][\w$]*)\.destination\.maxChannelCount/g,
              "($1.destination.maxChannelCount || 2)",
            )
            .replace(
              /(this\.audioContext\.destination\.channelCount = [a-zA-Z_$][\w$]*)/g,
              "this.audioContext.destination.maxChannelCount && ($1)",
            );
      },
    },
  ],
  root: "frontend",
  publicDir: "../public",
  build: {
    outDir: "../html",
    emptyOutDir: false,
    assetsInlineLimit: 0,
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: {
        studio: resolve("frontend/index.html"),
        sandbox: resolve("frontend/sandbox/index.html"),
        admin: resolve("frontend/admin/index.html"),
        sharePlayer: resolve("frontend/share-player/index.html"),
      },
    },
  },
});
