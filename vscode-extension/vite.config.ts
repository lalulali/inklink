import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile()
  ],
  root: 'webview',
  build: {
    outDir: '../dist/webview',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@core': path.resolve(__dirname, '../src/core'),
      '@components': path.resolve(__dirname, '../src/components'),
      '@lib': path.resolve(__dirname, '../src/lib'),
      '@platform': path.resolve(__dirname, '../src/platform'),
    },
  },
});
