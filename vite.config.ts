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
          const source = resolve(item);
          if (!existsSync(source)) continue;

          cpSync(source, resolve(outDir, item), {
            recursive: true,
            force: false,
          });
        }
      },
    },
  ],
});