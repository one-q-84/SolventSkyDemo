import { defineConfig } from 'vite'

export default defineConfig({
  // Serve from root — index.html lives at project root
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
})
