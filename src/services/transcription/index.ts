import type { Settings, TranscriptSource, TranscriptionEngineId } from '../../types';
import { LiveRecognizer, webSpeechSupported } from './webSpeech';
import { whisper } from './whisper';
import { geminiTranscribe, groqTranscribe } from '../ai';

export { whisper, WHISPER_MODELS } from './whisper';
export { webSpeechSupported } from './webSpeech';

export interface EngineInfo {
  id: TranscriptionEngineId;
  label: string;
  supported: boolean;
  local: boolean;
  description: string;
  unsupportedReason?: string;
}

export function engineInfo(settings: Settings): EngineInfo[] {
  return [
    {
      id: 'groq', label: 'Groq Whisper large-v3 (free AI, most accurate)', supported: !!settings.groqKey.trim(), local: false,
      unsupportedReason: 'Add a free Groq API key in AI Coach above',
      description: 'The large Whisper model running on Groq\'s servers. Very accurate with accented English and fast. Needs internet and a free API key.',
    },
    {
      id: 'gemini', label: 'Google Gemini (free AI)', supported: !!settings.geminiKey.trim(), local: false,
      unsupportedReason: 'Add a free Gemini API key in AI Coach above',
      description: 'Gemini listens to your recording and writes down exactly what you said, mistakes included. Needs internet and a free API key.',
    },
    {
      id: 'whisper', label: 'Whisper (offline, in browser)', supported: whisper.isSupported(), local: true,
      description: 'Smaller Whisper models running on this device. Private and free, but less accurate with accents. The model downloads once (40–250 MB). It may drop "um/uh" and fix small slips.',
    },
    {
      id: 'web-speech', label: 'Browser speech recognition', supported: webSpeechSupported(), local: false,
      description: 'Built into Chrome/Edge. Live but often inaccurate for learners; Chrome/Edge send audio to their cloud. Usually no punctuation.',
    },
    {
      id: 'manual', label: 'Type it myself', supported: true, local: true,
      description: 'No automatic transcription. After recording, listen back and type exactly what you said.',
    },
  ];
}

/** Returns the preferred engine if usable, otherwise the best available fallback. */
export function resolveEngine(settings: Settings): TranscriptionEngineId {
  const infos = engineInfo(settings);
  if (infos.find((e) => e.id === settings.transcriptionEngine)?.supported) return settings.transcriptionEngine;
  return infos.find((e) => e.supported && e.id !== 'manual' && e.id !== 'web-speech')?.id ?? 'manual';
}

export interface TranscriptionOutcome {
  text: string;
  source: TranscriptSource;
  error?: string;
}

/**
 * One transcription session per recording. Call `begin()` when recording starts
 * (live engines listen during recording) and `finish(blob)` after it stops.
 */
export class TranscriptionSession {
  readonly engine: TranscriptionEngineId;
  private settings: Settings;
  private live: LiveRecognizer | null = null;
  private result: Promise<TranscriptionOutcome> | null = null;

  constructor(settings: Settings) {
    this.settings = settings;
    this.engine = resolveEngine(settings);
  }

  begin(onLive?: (text: string) => void) {
    if (this.engine === 'web-speech') {
      this.live = new LiveRecognizer();
      this.live.onUpdate = onLive ?? null;
      this.live.start();
    } else if (this.engine === 'whisper') {
      // Warm up the model while the user speaks.
      whisper.load(this.settings.whisperModel).catch(() => undefined);
    }
  }

  /** Idempotent: repeated calls return the same result. */
  finish(blob: Blob | null): Promise<TranscriptionOutcome> {
    this.result ??= this.run(blob);
    return this.result;
  }

  private async run(blob: Blob | null): Promise<TranscriptionOutcome> {
    const s = this.settings;
    try {
      switch (this.engine) {
        case 'web-speech': {
          const text = this.live ? await this.live.stop() : '';
          return { text, source: 'web-speech', error: this.live?.error ?? undefined };
        }
        case 'whisper':
          if (!blob) break;
          return { text: cleanWhisper(await whisper.transcribe(blob, s.whisperModel)), source: 'whisper' };
        case 'groq':
          if (!blob) break;
          return { text: cleanWhisper(await groqTranscribe(s.groqKey.trim(), blob)), source: 'groq' };
        case 'gemini':
          if (!blob) break;
          return { text: await geminiTranscribe(s.geminiKey.trim(), s.geminiModel, blob), source: 'gemini' };
      }
    } catch (err) {
      return { text: '', source: 'manual', error: `Transcription failed: ${(err as Error).message}` };
    }
    return { text: '', source: 'manual' };
  }

  abort() {
    this.live?.abort();
  }
}

/** Whisper emits tags like "[BLANK_AUDIO]" or "(music)" for non-speech. */
function cleanWhisper(text: string): string {
  return text.replace(/\[[^\]]*\]|\((?:music|silence|inaudible|blank_audio)[^)]*\)/gi, ' ').replace(/\s+/g, ' ').trim();
}
