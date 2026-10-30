// Low-level audio helpers: capability detection, MIME selection, decoding and beeps.

export interface RecorderSupport {
  supported: boolean;
  reason?: string;
}

export function recorderSupport(): RecorderSupport {
  if (typeof window === 'undefined') return { supported: false, reason: 'Not running in a browser.' };
  if (!window.isSecureContext) {
    return { supported: false, reason: 'Microphone access needs a secure context. Open the app via http://localhost (not a LAN IP) or https.' };
  }
  if (!navigator.mediaDevices?.getUserMedia) return { supported: false, reason: 'This browser does not support microphone access (getUserMedia).' };
  if (typeof MediaRecorder === 'undefined') return { supported: false, reason: 'This browser does not support audio recording (MediaRecorder). Try a recent Chrome, Edge, Firefox or Safari.' };
  return { supported: true };
}

export function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t));
}

export function describeMicError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone permission was denied. Click the camera/microphone icon in the address bar, allow access, and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Connect a microphone and try again.';
    case 'NotReadableError':
    case 'AbortError':
      return 'The microphone is being used by another application or could not be started. Close other apps using it and try again.';
    default:
      return `Could not start the microphone${(err as Error)?.message ? `: ${(err as Error).message}` : '.'}`;
  }
}

/** Decodes an audio blob to 16 kHz mono Float32 samples (the format Whisper expects). */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const Ctx: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    const targetRate = 16000;
    const length = Math.ceil(decoded.duration * targetRate);
    const offline = new OfflineAudioContext(1, Math.max(1, length), targetRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    void ctx.close();
  }
}

/** Encodes mono Float32 samples as a 16-bit PCM WAV blob. */
export function encodeWav(samples: Float32Array, sampleRate = 16000): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/** Converts any recorded blob to a 16 kHz mono WAV (widely accepted by AI APIs). */
export async function toWav(blob: Blob): Promise<Blob> {
  return encodeWav(await decodeTo16kMono(blob));
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

let beepCtx: AudioContext | null = null;
export function beep(freq = 880, ms = 140): void {
  try {
    beepCtx ??= new AudioContext();
    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, beepCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, beepCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + ms / 1000);
    osc.connect(gain).connect(beepCtx.destination);
    osc.start();
    osc.stop(beepCtx.currentTime + ms / 1000 + 0.02);
  } catch {
    /* audio feedback is optional */
  }
}
