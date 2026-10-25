import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any static host or sub-folder.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
});
