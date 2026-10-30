import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { Attempt } from '../types';
import { deleteAttempt, getAttempt } from '../storage/db';
import { QuestionPrompt } from '../components/QuestionPrompt';
import { RecordingPlayer } from '../components/RecordingPlayer';
import { AttemptEditor } from '../components/AttemptEditor';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { Alert, Badge, Button, Card, CardHeader, ConfirmDialog, Spinner } from '../components/ui';
import { formatDateTime, formatSeconds } from '../utils/format';

export function AttemptDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getAttempt(id).then((a) => setAttempt(a ?? null));
  }, [id]);

  if (attempt === undefined) return <Spinner label="Loading…" />;
  if (attempt === null) return <Alert tone="error" title="Answer not found">It may have been deleted. <Link to="/history" className="underline">Back to history</Link></Alert>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/history" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back to history"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-xl font-bold">Answer review</h1>
            <p className="text-sm text-slate-500">
              {formatDateTime(attempt.createdAt)} · {formatSeconds(attempt.durationSeconds)} · {attempt.mode === 'test' ? 'Full test' : 'Practice'}
              {attempt.testId && <> · <Link className="text-brand-600 hover:underline dark:text-brand-400" to={`/test/results/${attempt.testId}`}>view test</Link></>}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><QuestionPrompt question={attempt.question} /></Card>
        <Card className="space-y-4">
          <CardHeader title="Recording & transcript" action={<Badge>evaluator {attempt.evaluation.evaluatorVersion}</Badge>} />
          <RecordingPlayer recordingId={attempt.recordingId} />
          <AttemptEditor key={attempt.editedTranscript ?? ''} attempt={attempt} onSaved={setAttempt} />
        </Card>
      </div>

      <FeedbackPanel evaluation={attempt.evaluation} originalTranscript={attempt.originalTranscript} editedTranscript={attempt.editedTranscript} />

      <ConfirmDialog
        open={confirmOpen}
        danger
        title="Delete this answer?"
        description="The answer, its evaluation and its recording will be permanently deleted."
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => { setConfirmOpen(false); await deleteAttempt(attempt.id); navigate('/history', { replace: true }); }}
      />
    </div>
  );
}
