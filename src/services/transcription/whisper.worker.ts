/// <reference lib="webworker" />
// Runs Whisper (via transformers.js / ONNX Runtime WASM) off the main thread.
import { env, pipeline } from '@huggingface/transformers';

type ASR = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<{ text: string } | { text: string }[]>;

let asr: ASR | null = null;
let loadedModel = '';
let loading: Promise<ASR> | null = null;

env.allowLocalModels = false;
const LOCAL_WASM = `${self.location.origin}${(import.meta.env.BASE_URL ?? '/')}ort/`;

function post(msg: unknown) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);
}

async function create(model: string, useLocalRuntime: boolean): Promise<ASR> {
  const onnx = env.backends.onnx as { wasm?: { wasmPaths?: string } };
  if (onnx.wasm) {
    if (useLocalRuntime) onnx.wasm.wasmPaths = LOCAL_WASM;
    else delete onnx.wasm.wasmPaths;
  }
  const p = await pipeline('automatic-speech-recognition', model, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
      post({ type: 'progress', status: p.status, file: p.file, progress: p.progress, loaded: p.loaded, total: p.total });
    },
  });
  return p as unknown as ASR;
}

async function ensure(model: string): Promise<ASR> {
  if (asr && loadedModel === model) return asr;
  if (loading && loadedModel === model) return loading;
  loadedModel = model;
  loading = (async () => {
    try {
      return await create(model, true);
    } catch (err) {
      // Local runtime files missing (e.g. copy script not run) → fall back to the default CDN runtime.
      console.warn('[whisper] local runtime failed, retrying with CDN runtime', err);
      return create(model, false);
    }
  })();
  try {
    asr = await loading;
    post({ type: 'ready', model });
    return asr;
  } catch (err) {
    loadedModel = '';
    asr = null;
    throw err;
  } finally {
    loading = null;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, id, model, audio } = e.data as { type: string; id?: number; model: string; audio?: Float32Array };
  try {
    if (type === 'load') {
      await ensure(model);
      return;
    }
    if (type === 'transcribe' && audio) {
      const run = await ensure(model);
      const out = await run(audio, { chunk_length_s: 30, stride_length_s: 5 });
      const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text;
      post({ type: 'result', id, text: text.trim() });
    }
  } catch (err) {
    post({ type: 'error', id, message: (err as Error)?.message ?? String(err) });
  }
};
