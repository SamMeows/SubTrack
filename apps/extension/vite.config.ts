import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
      },
    },
  },
  resolve: {
    alias: {
      '@subtrack/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
