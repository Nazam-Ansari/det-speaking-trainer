import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Timer, SkipForward } from 'lucide-react';
import type { Question, Settings } from '../types';
import { useRecorder, type RecordingResult } from '../hooks/useRecorder';
import { useCountdown } from '../hooks/useCountdown';
import { TranscriptionSession } from '../services/transcription';
import { beep } from '../services/audio';
import { QuestionPrompt } from './QuestionPrompt';
import { Alert, Button, Card } from './ui';
import { cn, formatSeconds } from '../utils/format';

export interface TaskOutcome {
  recording: RecordingResult;
  session: TranscriptionSession;
}

interface Props {
  question: Question;
  mode: 'practice' | 'test';
  prepSeconds: number;
  autoStart: boolean;
  beeps: boolean;
  readAloud: boolean;
  skipPrep?: boolean;
  settings: Settings;
  onFinished: (o: TaskOutcome) => void;
  /** Extra content under the prompt (e.g. progress). */
  header?: React.ReactNode;
}

type Phase = 'prep' | 'ready' | 'recording' | 'finishing';

export function LevelMeter({ level, active }: { level: number; active: boolean }) {
  const bars = 16;
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const threshold = (i + 1) / bars;
        const on = active && level >= threshold * 0.9;
        return (
          <span
            key={i}
            className={cn('w-1.5 rounded-full transition-all duration-75', on ? (i > 12 ? 'bg-amber-500' : 'bg-brand-500') : 'bg-slate-200 dark:bg-slate-700')}
            style={{ height: `${30 + (i / bars) * 70}%` }}
          />
        );
      })}
    </div>
  );
}

export function TimerRing({ remaining, total, label, tone }: { remaining: number; total: number; label: string; tone: 'prep' | 'rec' }) {
  const size = 104;
  const r = 44;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? remaining / total : 0;
  return (
    <div className="relative" style={{ width: size, height: size }} role="timer" aria-label={`${label}: ${Math.ceil(remaining)} seconds left`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} className="fill-none stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          className={cn('fill-none transition-[stroke-dashoffset] duration-100 ease-linear', tone === 'prep' ? 'stroke-sky-500' : remaining < 10 ? 'stroke-rose-500' : 'stroke-brand-500')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{formatSeconds(Math.ceil(remaining))}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      </div>
    </div>
  );
}

/**
 * Runs one speaking task: preparation countdown → recording (auto-stop at max time).
 * In test mode there are no hints, and "Next" is only enabled after the minimum time.
 */
export function SpeakingTask({ question, mode, prepSeconds, autoStart, beeps, readAloud, skipPrep, settings, onFinished, header }: Props) {
  // For read-aloud interactive questions, wait until the question has been spoken.
  const effectivePrep = skipPrep ? 0 : question.type === 'interactive' && readAloud
    ? Math.max(prepSeconds, Math.ceil(question.text.split(/\s+/).length / 2.6) + 1)
    : prepSeconds;
  const [phase, setPhase] = useState<Phase>(effectivePrep > 0 ? 'prep' : autoStart ? 'recording' : 'ready');
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const finishedRef = useRef(false);

  const finish = useCallback((r: RecordingResult) => {
    if (finishedRef.current || !sessionRef.current) return;
    finishedRef.current = true;
    if (beeps) beep(660, 160);
    setPhase('finishing');
    // Start transcription now (idempotent) so live recognizers flush before unmount.
    void sessionRef.current.finish(r.blob);
    onFinished({ recording: r, session: sessionRef.current });
  }, [beeps, onFinished]);

  const recorder = useRecorder({ maxSeconds: question.maxSeconds, onAutoStop: finish });

  const startRecording = useCallback(async () => {
    sessionRef.current?.abort();
    const session = new TranscriptionSession(settings);
    sessionRef.current = session;
    finishedRef.current = false;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const ok = await recorder.start();
    if (ok) {
      if (beeps) beep(880, 140);
      session.begin();
      setPhase('recording');
    } else {
      setPhase('ready');
    }
  }, [beeps, settings, recorder]);

  // Auto-start recording if we begin directly in the recording phase.
  const startedRef = useRef(false);
  useEffect(() => {
    if (phase === 'recording' && !startedRef.current) {
      startedRef.current = true;
      void startRecording();
    }
  }, [phase, startRecording]);

  const prepRemaining = useCountdown(effectivePrep, phase === 'prep', () => {
    if (autoStart) {
      startedRef.current = true;
      void startRecording();
    } else {
      setPhase('ready');
    }
  });

  useEffect(() => () => {
    if (!finishedRef.current) sessionRef.current?.abort();
  }, []);

  const stopNow = async () => {
    const r = await recorder.stop();
    if (r) finish(r);
  };

  const recRemaining = Math.max(0, question.maxSeconds - recorder.elapsed);
  const canStop = mode === 'practice' || recorder.elapsed >= question.minSeconds;
  const isRecording = recorder.status === 'recording';

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <Card className="min-w-0">
        {header}
        <QuestionPrompt question={question} showMeta={mode === 'practice'} readAloud={readAloud && !skipPrep} />
      </Card>

      <Card className="flex flex-col items-center gap-4 text-center lg:sticky lg:top-6 lg:self-start">
        {phase === 'prep' && (
          <>
            <TimerRing remaining={prepRemaining} total={effectivePrep} label="Prepare" tone="prep" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {autoStart ? 'Recording starts automatically when preparation time ends.' : 'Use this time to plan your answer.'}
            </p>
            <Button variant="outline" onClick={() => { startedRef.current = true; void startRecording(); }}>
              <SkipForward className="h-4 w-4" /> Start speaking now
            </Button>
          </>
        )}

        {phase === 'ready' && !isRecording && (
          <>
            <div className="rounded-full bg-brand-50 p-5 text-brand-600 dark:bg-brand-950 dark:text-brand-400"><Mic className="h-8 w-8" /></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">You have up to {formatSeconds(question.maxSeconds)} to speak.</p>
            <Button size="lg" onClick={() => void startRecording()} loading={recorder.status === 'requesting'}>
              <Mic className="h-5 w-5" /> Start recording
            </Button>
          </>
        )}

        {(phase === 'recording' || isRecording) && phase !== 'finishing' && (
          <>
            {recorder.status === 'requesting' ? (
              <p className="py-8 text-sm text-slate-500">Waiting for microphone permission…</p>
            ) : (
              <>
                <div className="relative">
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-rose-500/30" />
                  <TimerRing remaining={recRemaining} total={question.maxSeconds} label="Speaking" tone="rec" />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Recording · {formatSeconds(recorder.elapsed)}
                </div>
                <LevelMeter level={recorder.level} active={isRecording} />
                {mode === 'test' && !canStop && (
                  <p className="flex items-center gap-1 text-xs text-slate-500"><Timer className="h-3.5 w-3.5" /> “Next” unlocks after {question.minSeconds}s</p>
                )}
                {mode === 'practice' && recorder.elapsed < question.minSeconds && (
                  <p className="text-xs text-slate-500">Suggested minimum: {question.minSeconds}s</p>
                )}
                <Button size="lg" variant={mode === 'test' ? 'primary' : 'danger'} onClick={() => void stopNow()} disabled={!canStop || !isRecording}>
                  {mode === 'test' ? <>Next <SkipForward className="h-4 w-4" /></> : <><Square className="h-4 w-4" /> Stop recording</>}
                </Button>
              </>
            )}
          </>
        )}

        {phase === 'finishing' && <p className="py-8 text-sm text-slate-500">Saving your answer…</p>}

        {recorder.error && (
          <Alert tone="error" title="Microphone problem" className="text-left">
            {recorder.error}
            <div className="mt-2"><Button size="sm" variant="outline" onClick={() => void startRecording()}>Try again</Button></div>
          </Alert>
        )}
      </Card>
    </div>
  );
}
