import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; `npm run deploy` sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  optimizeDeps: {
    // transformers.js ships its own WASM loader; pre-bundling breaks it.
    exclude: ['@huggingface/transformers'],
  },
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1500 },
  test: { environment: 'node' },
} as any);
