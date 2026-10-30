import { useCallback, useEffect, useRef, useState } from 'react';
import { describeMicError, pickMimeType, recorderSupport } from '../services/audio';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  mimeType: string;
  /** Peak RMS level 0–1; very low values mean the recording is probably silent. */
  peakLevel: number;
  likelySilent: boolean;
}

interface Options {
  maxSeconds?: number;
  onAutoStop?: (r: RecordingResult) => void;
}

const SILENCE_THRESHOLD = 0.02;

/**
 * Reusable microphone recorder built on MediaRecorder.
 * Exposes live level (for a meter), elapsed time and the final blob.
 */
export function useRecorder({ maxSeconds, onAutoStop }: Options = {}) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const peakRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopResolveRef = useRef<((r: RecordingResult | null) => void) | null>(null);
  const autoStopRef = useRef(onAutoStop);
  autoStopRef.current = onAutoStop;
  const maxRef = useRef(maxSeconds);
  maxRef.current = maxSeconds;
  const urlRef = useRef<string | null>(null);

  const support = recorderSupport();

  const cleanupStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => {
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.onstop = null;
      recRef.current.stop();
    }
    cleanupStream();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, [cleanupStream]);

  const stop = useCallback((): Promise<RecordingResult | null> => {
    const rec = recRef.current;
    if (!rec || rec.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      stopResolveRef.current = resolve;
      rec.stop();
    });
  }, []);

  const start = useCallback(async () => {
    if (!support.supported) {
      setError(support.reason ?? 'Recording is not supported.');
      setStatus('error');
      return false;
    }
    setError(null);
    setStatus('requesting');
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recRef.current = rec;
      chunksRef.current = [];
      peakRef.current = 0;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const duration = (performance.now() - startRef.current) / 1000;
        const type = rec.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const r: RecordingResult = {
          blob, url, durationSeconds: Math.min(duration, maxRef.current ?? Infinity), mimeType: type,
          peakLevel: peakRef.current, likelySilent: peakRef.current < SILENCE_THRESHOLD || blob.size < 1000,
        };
        cleanupStream();
        setResult(r);
        setStatus('stopped');
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        if (resolve) resolve(r);
        else autoStopRef.current?.(r);
      };

      // Level meter
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        peakRef.current = Math.max(peakRef.current, rms);
        setLevel(Math.min(1, rms * 6));
        const secs = (performance.now() - startRef.current) / 1000;
        setElapsed(secs);
        if (maxRef.current && secs >= maxRef.current && rec.state === 'recording') {
          rec.stop();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rec.start(250);
      // rAF pauses in background tabs, so also enforce the limit with a timer.
      if (maxRef.current) {
        const limit = maxRef.current;
        window.setTimeout(() => {
          if (recRef.current === rec && rec.state === 'recording') rec.stop();
        }, limit * 1000 + 50);
      }
      startRef.current = performance.now();
      setElapsed(0);
      setStatus('recording');
      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch (err) {
      cleanupStream();
      setError(describeMicError(err));
      setStatus('error');
      return false;
    }
  }, [cleanupStream, support.supported, support.reason]);

  const reset = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setResult(null);
    setElapsed(0);
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, elapsed, level, result, start, stop, reset, support };
}
