// Browser speech recognition (Web Speech API).
// NOTE: in Chrome and Edge this sends audio to the browser vendor's cloud service. It is
// not local. It only works while recording (it cannot transcribe a saved file).

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;

function getCtor(): Ctor | null {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function webSpeechSupported(): boolean {
  return typeof window !== 'undefined' && getCtor() !== null;
}

/** Live recognizer that runs alongside the MediaRecorder and auto-restarts on silence timeouts. */
export class LiveRecognizer {
  private rec: SpeechRecognitionLike | null = null;
  private finalText = '';
  private interim = '';
  private active = false;
  private endResolve: (() => void) | null = null;
  error: string | null = null;
  onUpdate: ((text: string) => void) | null = null;

  start(): boolean {
    const C = getCtor();
    if (!C) return false;
    this.finalText = '';
    this.interim = '';
    this.error = null;
    this.active = true;
    this.spawn(C);
    return true;
  }

  private spawn(C: Ctor) {
    const rec = new C();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += `${r[0].transcript.trim()} `;
        else interim += r[0].transcript;
      }
      this.interim = interim;
      this.onUpdate?.(this.text);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      this.error = e.error === 'not-allowed' ? 'Speech recognition permission denied.'
        : e.error === 'network' ? 'Speech recognition needs an internet connection in this browser.'
          : `Speech recognition error: ${e.error}`;
    };
    rec.onend = () => {
      // Chrome stops after a pause; restart while we are still recording.
      if (this.active && !this.error) {
        try { this.spawn(C); return; } catch { /* fall through */ }
      }
      this.endResolve?.();
      this.endResolve = null;
    };
    this.rec = rec;
    rec.start();
  }

  get text(): string {
    return `${this.finalText}${this.interim}`.replace(/\s+/g, ' ').trim();
  }

  /** Stops and waits briefly for the final result. */
  async stop(): Promise<string> {
    this.active = false;
    if (!this.rec) return this.text;
    const ended = new Promise<void>((r) => { this.endResolve = r; });
    try { this.rec.stop(); } catch { /* already stopped */ }
    await Promise.race([ended, new Promise((r) => setTimeout(r, 1500))]);
    // Include any interim text that never became final.
    return this.text;
  }

  abort() {
    this.active = false;
    try { this.rec?.abort(); } catch { /* ignore */ }
  }
}
