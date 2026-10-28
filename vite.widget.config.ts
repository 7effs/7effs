import react from '@vitejs/plugin-react'
import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// index.html references /strobi-widget.js and /strobi-widget.css at the repo root.
// Keep those root copies in lockstep with src/ on every widget build so they can
// never drift behind the current Baew widget source again.
const WIDGET_ASSETS = ['strobi-widget.js', 'strobi-widget.css']

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sync-root-widget-assets',
      apply: 'build',
      closeBundle() {
        for (const file of WIDGET_ASSETS) {
          cpSync(resolve('dist-widget', file), resolve(file), { force: true })
        }
      },
    },
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    lib: {
      entry: 'src/widget.tsx',
      name: 'StrobiWidget',
      formats: ['iife'],
      fileName: () => 'strobi-widget.js',
      cssFileName: 'strobi-widget',
    },
  },
})
