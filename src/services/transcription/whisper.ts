import { decodeTo16kMono } from '../audio';

export interface WhisperProgress {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export const WHISPER_MODELS = [
  { id: 'Xenova/whisper-tiny.en', label: 'Tiny (English) · ~40 MB · fastest, less accurate' },
  { id: 'Xenova/whisper-base.en', label: 'Base (English) · ~80 MB · recommended' },
  { id: 'Xenova/whisper-small.en', label: 'Small (English) · ~250 MB · most accurate, slow on CPU' },
];

type Listener = (p: WhisperProgress) => void;

/**
 * Local Whisper transcription in a Web Worker.
 *
 * The model weights are downloaded once from the Hugging Face hub and cached by the
 * browser (Cache Storage). After that, transcription runs fully on this device.
 */
class WhisperService {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
  private listeners = new Set<Listener>();
  private readyModel: string | null = null;
  private loadPromise: { model: string; promise: Promise<void> } | null = null;
  lastError: string | null = null;

  isSupported(): boolean {
    return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof OfflineAudioContext !== 'undefined';
  }

  isReady(model: string): boolean {
    return this.readyModel === model;
  }

  onProgress(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'progress') this.listeners.forEach((fn) => fn(msg));
        else if (msg.type === 'ready') {
          this.readyModel = msg.model;
          this.listeners.forEach((fn) => fn({ status: 'ready' }));
        } else if (msg.type === 'result') {
          this.pending.get(msg.id)?.resolve(msg.text);
          this.pending.delete(msg.id);
        } else if (msg.type === 'error') {
          this.lastError = msg.message;
          if (msg.id != null) {
            this.pending.get(msg.id)?.reject(new Error(msg.message));
            this.pending.delete(msg.id);
          } else {
            this.listeners.forEach((fn) => fn({ status: 'error', file: msg.message }));
          }
        }
      };
      this.worker.onerror = (e) => {
        this.lastError = e.message || 'Whisper worker crashed.';
        for (const p of this.pending.values()) p.reject(new Error(this.lastError));
        this.pending.clear();
        this.worker = null;
      };
    }
    return this.worker;
  }

  /** Downloads (first time) and initialises the model. */
  load(model: string): Promise<void> {
    if (this.readyModel === model) return Promise.resolve();
    if (this.loadPromise?.model === model) return this.loadPromise.promise;
    const promise = new Promise<void>((resolve, reject) => {
      const off = this.onProgress((p) => {
        if (p.status === 'ready') {
          off();
          resolve();
        } else if (p.status === 'error') {
          off();
          reject(new Error(p.file ?? 'Failed to load Whisper'));
        }
      });
      this.getWorker().postMessage({ type: 'load', model });
    }).finally(() => {
      this.loadPromise = null;
    });
    this.loadPromise = { model, promise };
    return promise;
  }

  private queue: Promise<unknown> = Promise.resolve();

  /** Jobs run one at a time so a single ONNX session is never used concurrently. */
  transcribe(blob: Blob, model: string): Promise<string> {
    const job = this.queue.then(async () => {
      const audio = await decodeTo16kMono(blob);
      const id = this.nextId++;
      return new Promise<string>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.getWorker().postMessage({ type: 'transcribe', id, model, audio }, [audio.buffer]);
      });
    });
    this.queue = job.catch(() => undefined);
    return job;
  }
}

export const whisper = new WhisperService();
