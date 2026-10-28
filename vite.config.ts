import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { cpSync, existsSync, mkdirSync } from "node:fs";

const ROOT_STATIC = [
  "strobi-widget.js",
  "strobi-widget.css",
  "Music.mp3",
  "demi.png",
  "jaye-video-background.mp4",
  "glimpse",
  "assets",
];

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-root-static",
      apply: "build",
      closeBundle() {
        const outDir = resolve("dist");
        mkdirSync(outDir, { recursive: true });

        for (const item of ROOT_STATIC) {
          const isWidget = item.startsWith("strobi-widget");
          // Widget files: prefer the fresh dist-widget build, fall back to the
          // root copy that build:widget keeps in sync. Always overwrite so a
          // stale file can never survive in dist/.
          const freshWidget = resolve("dist-widget", item);
          const source =
            isWidget && existsSync(freshWidget) ? freshWidget : resolve(item);
          if (!existsSync(source)) continue;

          cpSync(source, resolve(outDir, item), {
            recursive: true,
            force: isWidget,
          });
        }

        // Fail the build instead of shipping a "Ready" deploy with no widget.
        for (const file of ["strobi-widget.js", "strobi-widget.css"]) {
          if (!existsSync(resolve(outDir, file))) {
            throw new Error(`Baew widget asset missing from dist: ${file}`);
          }
        }
      },
    },
  ],
});
