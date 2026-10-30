import type { AiProvider, DimensionScore, EvaluationCriterion, Evaluation, Issue, Question, Settings } from '../../types';
import { evaluateAnswer } from '../../engines/evaluation';
import { CRITERION_LABELS } from '../../engines/scoring';
import { systemPrompt, userPrompt, type AiFeedback } from './prompt';
import { geminiEvaluate } from './gemini';
import { groqEvaluate } from './groq';

export { geminiModels, geminiTranscribe, pickGeminiModel, setGeminiModelListener } from './gemini';
export { groqModels, groqTranscribe, pickGroqModel, setGroqModelListener, GROQ_TRANSCRIBE_MODEL } from './groq';

export const AI_PROVIDERS: Record<AiProvider, { label: string; keyUrl: string; keyHint: string }> = {
  gemini: { label: 'Google Gemini', keyUrl: 'https://aistudio.google.com/apikey', keyHint: 'Starts with "AIza…"' },
  groq: { label: 'Groq', keyUrl: 'https://console.groq.com/keys', keyHint: 'Starts with "gsk_…"' },
};

export function keyFor(settings: Settings, p: AiProvider): string {
  return (p === 'gemini' ? settings.geminiKey : settings.groqKey).trim();
}

/** The active AI provider, or null when AI is off or has no key. */
export function activeAi(settings: Settings): AiProvider | null {
  if (settings.aiProvider === 'none') return null;
  return keyFor(settings, settings.aiProvider) ? settings.aiProvider : null;
}

const CRITERIA: EvaluationCriterion[] = ['grammar', 'vocabulary', 'fluency', 'relevance', 'development', 'structure'];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

/**
 * Evaluates with the configured AI provider, merged with the locally measured fluency
 * metrics. Falls back to the rule-based evaluation (with `aiError` set) if the AI call fails.
 */
export async function evaluateWithAi(settings: Settings, q: Question, transcript: string, durationSeconds: number, audio: Blob | null): Promise<Evaluation> {
  const local = evaluateAnswer(q, transcript, durationSeconds);
  const provider = activeAi(settings);
  if (!provider || !transcript.trim()) return local;

  const sendAudio = provider === 'gemini' && settings.aiListenToAudio && !!audio && audio.size > 0;
  const system = systemPrompt(settings, sendAudio);
  const user = userPrompt(q, transcript, local.fluency);
  let fb: AiFeedback;
  const model = provider === 'gemini' ? settings.geminiModel : settings.groqModel;
  try {
    fb = provider === 'gemini'
      ? await geminiEvaluate(settings.geminiKey.trim(), model, system, user, sendAudio ? audio : null)
      : await groqEvaluate(settings.groqKey.trim(), model, system, user);
  } catch (e) {
    return { ...local, aiError: (e as Error).message };
  }

  const det = Math.round(clamp(fb.det_score, 10, 160) / 5) * 5;
  const dimensions: DimensionScore[] = CRITERIA.map((key) => ({
    key,
    label: CRITERION_LABELS[key],
    score: clamp(fb[key]?.score, 0, 100),
    kind: 'estimate',
    explanation: fb[key]?.comment ?? '',
    suggestions: [],
  }));
  const corrections = (fb.corrections ?? []).filter((c) => c.original && c.corrected).slice(0, 8);
  const issues: Issue[] = [
    ...corrections.map((c): Issue => ({ category: 'grammar', message: c.explanation, excerpt: c.original })),
    // Keep the objective, measured observations from the local engine.
    ...local.issues.filter((i) => i.category === 'filler' || i.category === 'length'),
  ];

  return {
    // Stored on the 0–100 scale so the existing /160 display shows the AI's number.
    practiceScore: clamp((det - 10) / 1.5, 0, 100),
    dimensions,
    fluency: local.fluency,
    issues,
    corrections: corrections.map((c) => ({ original: c.original, corrected: c.corrected, reasons: [c.explanation] })),
    polishedVersion: fb.corrected_answer?.trim() || local.polishedVersion,
    modelAnswer: fb.better_answer?.trim() || local.modelAnswer,
    modelAnswerKind: fb.better_answer ? 'ai' : local.modelAnswerKind,
    tips: (fb.tips ?? []).slice(0, 5),
    strengths: (fb.strengths ?? []).slice(0, 3),
    pronunciation: 'unavailable',
    evaluatorVersion: `ai-${provider}`,
    ai: { provider, model, detScore: det, pronunciationNotes: sendAudio && fb.pronunciation ? fb.pronunciation : undefined },
  };
}
