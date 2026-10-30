import { useEffect, useState } from 'react';
import { CircleCheck, Mic, Square, Download } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { LevelMeter } from './SpeakingTask';
import { Alert, Button, ProgressBar } from './ui';
import { whisper, type WhisperProgress } from '../services/transcription/whisper';
import { formatBytes } from '../utils/format';

/** Records a short sample to confirm the microphone works and picks up the voice. */
export function MicCheck({ onResult }: { onResult: (ok: boolean) => void }) {
  const rec = useRecorder({ maxSeconds: 5 });
  const url = useObjectUrl(rec.result?.blob);
  const ok = rec.result ? !rec.result.likelySilent : null;

  useEffect(() => {
    if (ok !== null) onResult(ok);
  }, [ok, onResult]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {rec.status === 'recording' ? (
          <Button variant="danger" onClick={() => void rec.stop()}><Square className="h-4 w-4" /> Stop ({Math.ceil(5 - rec.elapsed)}s)</Button>
        ) : (
          <Button variant={ok ? 'outline' : 'primary'} onClick={() => void rec.start()} loading={rec.status === 'requesting'}>
            <Mic className="h-4 w-4" /> {rec.result ? 'Test again' : 'Test microphone'}
          </Button>
        )}
        <LevelMeter level={rec.level} active={rec.status === 'recording'} />
      </div>
      {rec.status === 'recording' && <p className="text-sm text-slate-500">Say: “Hello, I am preparing for the Duolingo English Test.”</p>}
      {rec.error && <Alert tone="error" title="Microphone problem">{rec.error}</Alert>}
      {ok === true && (
        <Alert tone="success" title="Microphone is working">Play it back to check the quality.</Alert>
      )}
      {ok === false && <Alert tone="warning" title="We could not hear you">Check that the right microphone is selected and not muted, then test again.</Alert>}
      {url && <audio src={url} controls />}
    </div>
  );
}

/** Downloads/initialises the Whisper model and shows progress. */
export function WhisperPreloader({ model, onReady }: { model: string; onReady?: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>(whisper.isReady(model) ? 'ready' : 'idle');
  const [files, setFiles] = useState<Record<string, { loaded: number; total: number }>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state === 'ready') onReady?.();
  }, [state, onReady]);

  const start = () => {
    setState('loading');
    setError(null);
    const off = whisper.onProgress((p: WhisperProgress) => {
      if (p.status === 'progress' && p.file && p.total) {
        setFiles((f) => ({ ...f, [p.file!]: { loaded: p.loaded ?? 0, total: p.total ?? 0 } }));
      }
    });
    whisper.load(model)
      .then(() => setState('ready'))
      .catch((e: Error) => { setError(e.message); setState('error'); })
      .finally(off);
  };

  const loaded = Object.values(files).reduce((n, f) => n + f.loaded, 0);
  const total = Object.values(files).reduce((n, f) => n + f.total, 0);

  if (state === 'ready') return <Alert tone="success" title="Whisper model ready">Transcription will run locally on this device.</Alert>;
  return (
    <div className="space-y-3">
      {state === 'idle' && (
        <Button variant="outline" onClick={start}><Download className="h-4 w-4" /> Load Whisper model</Button>
      )}
      {state === 'loading' && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            Loading model… {total > 0 ? `${formatBytes(loaded)} / ${formatBytes(total)}` : 'starting'} (downloaded once, then cached)
          </p>
          <ProgressBar value={total ? (loaded / total) * 100 : 5} colorByScore={false} />
        </div>
      )}
      {state === 'error' && (
        <Alert tone="error" title="Could not load Whisper">
          {error}. Check your internet connection for the first download, or choose a different transcription engine in Settings.
          <div className="mt-2"><Button size="sm" variant="outline" onClick={start}>Retry</Button></div>
        </Alert>
      )}
      {state !== 'loading' && state !== 'error' && <p className="flex items-center gap-1 text-xs text-slate-400"><CircleCheck className="h-3.5 w-3.5" /> Recommended before starting so transcription is fast.</p>}
    </div>
  );
}
