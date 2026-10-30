import { useEffect, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { Question, TranscriptSource } from '../types';
import type { TaskOutcome } from './SpeakingTask';
import { TranscriptEditor } from './TranscriptEditor';
import { QuestionPrompt } from './QuestionPrompt';
import { Alert, Button, Card, CardHeader, Spinner } from './ui';
import { formatSeconds } from '../utils/format';
import { useObjectUrl } from '../hooks/useObjectUrl';

export interface ReviewedAnswer {
  originalTranscript: string;
  editedTranscript: string | null;
  source: TranscriptSource;
  durationSeconds: number;
  blob: Blob;
}

/**
 * Practice-mode review step: listen back, see/edit the transcript, re-record or submit.
 */
export function AnswerReview({ question, outcome, autoPlay, onReRecord, onSubmit }: {
  question: Question;
  outcome: TaskOutcome;
  autoPlay: boolean;
  onReRecord: () => void;
  onSubmit: (a: ReviewedAnswer) => void;
}) {
  const [status, setStatus] = useState<'transcribing' | 'done'>('transcribing');
  const [original, setOriginal] = useState('');
  const [text, setText] = useState('');
  const [source, setSource] = useState<TranscriptSource>(outcome.session.engine === 'manual' ? 'manual' : outcome.session.engine);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { recording } = outcome;
  const audioUrl = useObjectUrl(recording.blob);

  useEffect(() => {
    let alive = true;
    outcome.session.finish(recording.blob).then((r) => {
      if (!alive) return;
      setOriginal(r.text);
      setText(r.text);
      setSource(r.source);
      if (r.error) setError(r.error);
      setStatus('done');
    });
    return () => { alive = false; };
  }, [outcome, recording.blob]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSubmitError(recording.likelySilent
        ? 'No speech was detected and the transcript is empty. Re-record your answer, or type what you said.'
        : 'The transcript is empty. Type what you said (listen to the recording above) before submitting.');
      return;
    }
    onSubmit({
      originalTranscript: original.trim() || trimmed,
      editedTranscript: original.trim() && trimmed !== original.trim() ? trimmed : null,
      // If there was no automatic transcript, the user typed it.
      source: original.trim() ? source : 'manual',
      durationSeconds: recording.durationSeconds,
      blob: recording.blob,
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Card>
        <QuestionPrompt question={question} compact />
      </Card>
      <Card className="space-y-4">
        <CardHeader title="Review your answer" subtitle={`Recorded ${formatSeconds(recording.durationSeconds)} of ${formatSeconds(question.maxSeconds)}`} />
        {audioUrl && <audio src={audioUrl} controls autoPlay={autoPlay} />}
        {recording.likelySilent && (
          <Alert tone="warning" title="Very little sound detected">
            Your microphone may be muted or too far away. Play the recording to check, and re-record if needed.
          </Alert>
        )}
        {recording.durationSeconds < question.minSeconds && (
          <Alert tone="info">You spoke for {Math.round(recording.durationSeconds)}s; the suggested minimum for this task is {question.minSeconds}s.</Alert>
        )}
        {status === 'transcribing' ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
            <Spinner label={outcome.session.engine === 'whisper' ? 'Transcribing locally with Whisper… (the first run downloads the model)' : outcome.session.engine === 'groq' || outcome.session.engine === 'gemini' ? 'Transcribing with AI…' : 'Finishing transcription…'} />
          </div>
        ) : (
          <>
            {error && <Alert tone="warning" title="Automatic transcription unavailable">{error} You can type your answer below.</Alert>}
            {!error && !original && outcome.session.engine !== 'manual' && (
              <Alert tone="warning">The transcriber returned no text. If you did speak, type what you said below.</Alert>
            )}
            <TranscriptEditor original={original} value={text} onChange={(v) => { setText(v); setSubmitError(null); }} source={original ? source : 'manual'} />
          </>
        )}
        {submitError && <Alert tone="error">{submitError}</Alert>}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onReRecord}><RotateCcw className="h-4 w-4" /> Re-record</Button>
          <Button onClick={submit} disabled={status === 'transcribing'}><Sparkles className="h-4 w-4" /> Evaluate answer</Button>
        </div>
      </Card>
    </div>
  );
}
