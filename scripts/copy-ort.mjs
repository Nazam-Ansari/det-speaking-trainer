// Copies the ONNX Runtime WASM files used by transformers.js into public/ort so that
// Whisper runs without fetching the runtime from a CDN. (Model weights are still
// downloaded once from Hugging Face and then cached by the browser.)
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = join('node_modules', '@huggingface', 'transformers', 'dist');
const dest = join('public', 'ort');
if (!existsSync(src)) process.exit(0);
mkdirSync(dest, { recursive: true });
for (const f of readdirSync(src)) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(f)) copyFileSync(join(src, f), join(dest, f));
}
