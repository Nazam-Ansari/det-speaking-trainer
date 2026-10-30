import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // transformers.js ships its own WASM loader; pre-bundling breaks it.
    exclude: ['@huggingface/transformers'],
  },
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1500 },
  test: { environment: 'node' },
} as any);
