import type { FluencyMetrics, Question, Settings } from '../../types';
import { TYPE_LABELS } from '../../data/questionBank';

/** Shape both providers must return. */
export interface AiFeedback {
  det_score: number;
  grammar: { score: number; comment: string };
  vocabulary: { score: number; comment: string };
  fluency: { score: number; comment: string };
  relevance: { score: number; comment: string };
  development: { score: number; comment: string };
  structure: { score: number; comment: string };
  corrected_answer: string;
  corrections: { original: string; corrected: string; explanation: string }[];
  better_answer: string;
  tips: string[];
  strengths: string[];
  pronunciation: string | null;
}

const dim = { type: 'OBJECT', properties: { score: { type: 'INTEGER' }, comment: { type: 'STRING' } }, required: ['score', 'comment'] };

/** Gemini responseSchema (OpenAPI subset). */
export const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    det_score: { type: 'INTEGER' },
    grammar: dim, vocabulary: dim, fluency: dim, relevance: dim, development: dim, structure: dim,
    corrected_answer: { type: 'STRING' },
    corrections: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { original: { type: 'STRING' }, corrected: { type: 'STRING' }, explanation: { type: 'STRING' } }, required: ['original', 'corrected', 'explanation'] },
    },
    better_answer: { type: 'STRING' },
    tips: { type: 'ARRAY', items: { type: 'STRING' } },
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    pronunciation: { type: 'STRING', nullable: true },
  },
  required: ['det_score', 'grammar', 'vocabulary', 'fluency', 'relevance', 'development', 'structure', 'corrected_answer', 'corrections', 'better_answer', 'tips', 'strengths'],
};

export function systemPrompt(settings: Settings, withAudio: boolean): string {
  const lang = settings.aiExplainLanguage === 'roman-urdu'
    ? 'Write every "comment", "explanation", "tips", "strengths" and "pronunciation" text in simple Roman Urdu (Urdu written in English letters), keeping English grammar terms and example words in English. "corrected_answer" and "better_answer" must stay in English.'
    : 'Write all explanations in simple, clear English suitable for an intermediate learner.';
  return [
    'You are an experienced Duolingo English Test (DET) speaking examiner and a supportive English coach.',
    'Evaluate one spoken answer from an intermediate learner whose goal is a DET score of 130+.',
    'The text answer comes from automatic speech recognition: ignore punctuation and capitalisation, and do not penalise words that are obviously mis-recognised.',
    withAudio
      ? 'You also receive the audio recording. Use it to judge fluency (pauses, hesitation, pace) and give 1–3 sentences of specific pronunciation feedback in "pronunciation" (sounds, word stress, clarity). Be honest about what you could not hear clearly.'
      : 'You do NOT have the audio, so set "pronunciation" to null and judge fluency only from the text and the timing data.',
    'Scoring: "det_score" is your estimate of the DET overall level this single answer reflects, an integer from 10 to 160 in steps of 5 (e.g. 95, 100, 105). Be realistic and consistent: a short, error-heavy answer is 60–85; typical intermediate 90–110; strong upper-intermediate 115–130; near-native 135–160.',
    'Each of grammar, vocabulary, fluency, relevance, development, structure gets a 0–100 score and a one-sentence comment.',
    '"corrected_answer": the learner\'s own answer with every grammar, word-choice and article mistake fixed. Keep their ideas, order and most of their words; do not add new content.',
    '"corrections": up to 8 items. "original" = the exact wrong phrase or sentence, "corrected" = the fix, "explanation" = a short reason.',
    '"better_answer": a natural, well-organised model answer to the same question that would score 130+ (roughly 70–120 words for short tasks, 150–200 for the Speaking Sample).',
    '"tips": exactly 3 short, specific, actionable tips. "strengths": up to 3.',
    lang,
    'Return ONLY valid JSON matching the requested schema.',
  ].join('\n');
}

export function userPrompt(q: Question, transcript: string, m: FluencyMetrics): string {
  return [
    `Task type: ${TYPE_LABELS[q.type]}`,
    `Question: ${q.text}`,
    q.cues?.length ? `Guiding points: ${q.cues.join(' / ')}` : '',
    q.type === 'photo' ? `The photo shows a scene related to: ${q.keywords.join(', ')}.` : '',
    `Time allowed: ${q.minSeconds}–${q.maxSeconds} seconds. The learner spoke for ${m.speakingSeconds} seconds (${m.wordCount} words${m.wordsPerMinute ? `, ${m.wordsPerMinute} words per minute` : ''}).`,
    '',
    'Learner\'s answer (transcript):',
    `"""${transcript}"""`,
    '',
    'JSON keys: det_score, grammar, vocabulary, fluency, relevance, development, structure (each {score, comment}), corrected_answer, corrections [{original, corrected, explanation}], better_answer, tips, strengths, pronunciation.',
  ].filter((l) => l !== '').join('\n');
}

export function parseFeedback(raw: string): AiFeedback {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const obj = JSON.parse(start >= 0 ? text.slice(start, end + 1) : text) as AiFeedback;
  if (typeof obj.det_score !== 'number' || typeof obj.corrected_answer !== 'string') throw new Error('AI returned an unexpected format.');
  return obj;
}
