import type { Attempt, Question, TestResult, TranscriptSource } from '../types';
import { dimensionAverages, overallScore } from '../engines/scoring';
import { getRecording, loadSettings, newId, saveAttempt, saveRecording, saveTest } from '../storage/db';
import { evaluateWithAi } from './ai';

export interface NewAttemptInput {
  question: Question;
  originalTranscript: string;
  editedTranscript: string | null;
  source: TranscriptSource;
  durationSeconds: number;
  blob?: Blob | null;
  mode: 'practice' | 'test';
  sessionId: string;
  testId?: string;
  scenarioId?: string;
  storeRecording: boolean;
  createdAt?: number;
}

/** Evaluates an answer, stores the recording (if enabled) and persists the attempt. */
export async function createAttempt(input: NewAttemptInput): Promise<Attempt> {
  const text = input.editedTranscript ?? input.originalTranscript;
  const evaluation = await evaluateWithAi(await loadSettings(), input.question, text, input.durationSeconds, input.blob ?? null);
  let recordingId: string | undefined;
  if (input.storeRecording && input.blob && input.blob.size > 0) {
    try {
      recordingId = await saveRecording(input.blob);
    } catch (e) {
      console.warn('Could not store recording (storage may be full):', e);
    }
  }
  const attempt: Attempt = {
    id: newId('att'),
    createdAt: input.createdAt ?? Date.now(),
    mode: input.mode,
    sessionId: input.sessionId,
    testId: input.testId,
    scenarioId: input.scenarioId,
    question: input.question,
    originalTranscript: input.originalTranscript,
    editedTranscript: input.editedTranscript,
    transcriptSource: input.source,
    durationSeconds: input.durationSeconds,
    recordingId,
    evaluation,
  };
  await saveAttempt(attempt);
  return attempt;
}

/** Re-runs the evaluation after the user edits a stored transcript. */
export async function updateTranscript(attempt: Attempt, newText: string): Promise<Attempt> {
  const trimmed = newText.trim();
  const edited = trimmed === attempt.originalTranscript.trim() ? null : trimmed;
  const audio = attempt.recordingId ? (await getRecording(attempt.recordingId))?.blob ?? null : null;
  const updated: Attempt = {
    ...attempt,
    editedTranscript: edited,
    evaluation: await evaluateWithAi(await loadSettings(), attempt.question, edited ?? attempt.originalTranscript, attempt.durationSeconds, audio),
  };
  await saveAttempt(updated);
  return updated;
}

export async function saveTestResult(base: Omit<TestResult, 'overallScore' | 'dimensionAverages'>, attempts: Attempt[]): Promise<TestResult> {
  const result: TestResult = { ...base, overallScore: overallScore(attempts), dimensionAverages: dimensionAverages(attempts) };
  await saveTest(result);
  return result;
}
