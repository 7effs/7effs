import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-strobi-widget",
      closeBundle() {
        const outDir = resolve("dist");
        mkdirSync(outDir, { recursive: true });

        for (const file of ["strobi-widget.js", "strobi-widget.css"]) {
          const source = resolve(file);
          if (existsSync(source)) {
            copyFileSync(source, resolve(outDir, file));
          }
        }
      },
    },
  ],
});
