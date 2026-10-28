import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
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
