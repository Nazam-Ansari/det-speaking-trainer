import type { Attempt, EvaluationCriterion, IssueCategory, QuestionType } from '../types';

export const CRITERIA: EvaluationCriterion[] = ['grammar', 'vocabulary', 'fluency', 'relevance', 'development', 'structure'];
export const CRITERION_LABELS: Record<EvaluationCriterion, string> = {
  grammar: 'Grammar', vocabulary: 'Vocabulary', fluency: 'Fluency indicators',
  relevance: 'Answer relevance', development: 'Answer development', structure: 'Sentence structure',
};

/**
 * Converts the 0–100 Practice Score to a DET-style 10–160 number (steps of 5).
 * This is the app's own linear estimate, not an official Duolingo calculation.
 */
export function toDetScore(practiceScore: number): number {
  const raw = 10 + Math.max(0, Math.min(100, practiceScore)) * 1.5;
  return Math.round(raw / 5) * 5;
}

export function average(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

export function dimensionAverages(attempts: Attempt[]): Record<EvaluationCriterion, number> {
  const out = {} as Record<EvaluationCriterion, number>;
  for (const c of CRITERIA) {
    out[c] = average(attempts.map((a) => a.evaluation.dimensions.find((d) => d.key === c)?.score ?? 0));
  }
  return out;
}

export function overallScore(attempts: Attempt[]): number {
  return average(attempts.map((a) => a.evaluation.practiceScore));
}

export interface MistakeSummary { category: IssueCategory; message: string; count: number; examples: string[] }

/** Groups issues across attempts to surface recurring mistakes. */
export function commonMistakes(attempts: Attempt[], limit = 8): MistakeSummary[] {
  const map = new Map<string, MistakeSummary>();
  for (const a of attempts) {
    for (const i of a.evaluation.issues) {
      // Group repetition issues by category so each repeated word doesn't become its own row.
      const key = i.category === 'repetition' || i.category === 'length' || i.category === 'filler' ? i.category : `${i.category}|${i.message}`;
      const entry = map.get(key) ?? {
        category: i.category,
        message: i.category === 'repetition' ? 'Repeating the same words' : i.category === 'length' ? 'Short or slow answers' : i.category === 'filler' ? 'Filler words / hesitation' : i.message,
        count: 0, examples: [],
      };
      entry.count++;
      if (i.excerpt && entry.examples.length < 4 && !entry.examples.includes(i.excerpt)) entry.examples.push(i.excerpt);
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export interface Recommendation { title: string; detail: string; type?: QuestionType }

export function recommendations(attempts: Attempt[]): Recommendation[] {
  if (!attempts.length) return [];
  const dims = dimensionAverages(attempts);
  const weakest = (Object.entries(dims) as [EvaluationCriterion, number][]).sort((a, b) => a[1] - b[1]);
  const byType = new Map<QuestionType, number[]>();
  for (const a of attempts) byType.set(a.question.type, [...(byType.get(a.question.type) ?? []), a.evaluation.practiceScore]);
  const typeAvg = [...byType.entries()].map(([t, s]) => [t, average(s)] as const).sort((a, b) => a[1] - b[1]);

  const recs: Recommendation[] = [];
  if (typeAvg.length) {
    const [t, s] = typeAvg[0];
    recs.push({ title: `Practise ${typeLabel(t)}`, detail: `Your lowest task type (average Practice Score ${s}). Do 5 focused attempts in Practice Mode.`, type: t });
  }
  const advice: Record<EvaluationCriterion, Recommendation> = {
    grammar: { title: 'Grammar accuracy drill', detail: 'Review your Corrections list, then re-record the same answers, applying each fix.' },
    vocabulary: { title: 'Vocabulary upgrade', detail: 'Before answering, list 3 precise topic words during prep time and use all of them.' },
    fluency: { title: 'Fluency: speak longer without stopping', detail: 'Use Speaking Sample tasks and aim to talk for the full time with silent pauses instead of fillers.' },
    relevance: { title: 'Stay on topic', detail: 'Begin every answer by repeating the key words of the question.', type: 'read-then-speak' },
    development: { title: 'Develop your ideas', detail: 'Use the Point → Reason → Example structure for every answer.', type: 'speaking-sample' },
    structure: { title: 'Sentence variety', detail: 'Use at least two linking words ("although", "which", "however") in each answer.' },
  };
  for (const [c] of weakest.slice(0, 2)) recs.push(advice[c]);
  return recs;
}

export function typeLabel(t: QuestionType): string {
  return ({ photo: 'Speak About the Photo', 'read-then-speak': 'Read, Then Speak', interactive: 'Interactive Speaking', 'speaking-sample': 'Speaking Sample' } as const)[t];
}

export function strengthsAndWeaknesses(attempts: Attempt[]): { strengths: string[]; weaknesses: string[] } {
  const dims = dimensionAverages(attempts);
  const entries = (Object.entries(dims) as [EvaluationCriterion, number][]).sort((a, b) => b[1] - a[1]);
  return {
    strengths: entries.filter(([, v]) => v >= 70).slice(0, 3).map(([k, v]) => `${CRITERION_LABELS[k]} (${v})`),
    weaknesses: entries.filter(([, v]) => v < 70).reverse().slice(0, 3).map(([k, v]) => `${CRITERION_LABELS[k]} (${v})`),
  };
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-brand-600 dark:text-brand-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-brand-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}
