import { useState } from 'react';
import { Save } from 'lucide-react';
import type { Attempt } from '../types';
import { updateTranscript } from '../services/attempts';
import { TranscriptEditor } from './TranscriptEditor';
import { Alert, Button } from './ui';

/** Edit a stored transcript and re-run the evaluation. */
export function AttemptEditor({ attempt, onSaved }: { attempt: Attempt; onSaved: (a: Attempt) => void }) {
  const [text, setText] = useState(attempt.editedTranscript ?? attempt.originalTranscript);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = attempt.editedTranscript ?? attempt.originalTranscript;
  const dirty = text.trim() !== current.trim();

  const save = async () => {
    if (!text.trim()) {
      setError('The transcript cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await updateTranscript(attempt, text));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <TranscriptEditor original={attempt.originalTranscript} value={text} onChange={setText} source={attempt.transcriptSource} />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={!dirty} loading={saving}><Save className="h-4 w-4" /> Save & re-evaluate</Button>
      </div>
    </div>
  );
}
