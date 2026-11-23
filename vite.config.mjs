import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  publicDir: resolve(import.meta.dirname, 'public'),
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        letter: resolve(import.meta.dirname, 'src/views/letters.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html')
      }
    }
  }
});
