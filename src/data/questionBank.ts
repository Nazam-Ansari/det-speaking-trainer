import type {
  Difficulty, EvaluationCriterion, InteractiveNode, InteractiveScenario, Question, QuestionType, Topic,
} from '../types';
import readThenSpeak from './questions/read-then-speak.json';
import speakingSample from './questions/speaking-sample.json';
import photo from './questions/photo.json';
import interactive from './questions/interactive.json';

/**
 * Question bank.
 *
 * To add questions, edit the JSON files in ./questions. Each file has a `defaults`
 * block (timers, criteria) that is applied to every entry unless the entry overrides it.
 */

interface RawFile {
  type: string;
  defaults: { prepSeconds: number; minSeconds: number; maxSeconds: number; criteria: string[] };
  questions: Array<Partial<Question> & { id: string; text: string; topic: string; difficulty: string; keywords: string[] }>;
}

const ALL_CRITERIA: EvaluationCriterion[] = ['grammar', 'vocabulary', 'fluency', 'relevance', 'development', 'structure'];
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

function load(file: RawFile): Question[] {
  return file.questions.map((q) => {
    if (!DIFFICULTIES.includes(q.difficulty as Difficulty)) {
      console.warn(`[questionBank] ${q.id}: unknown difficulty "${q.difficulty}"`);
    }
    return {
      ...q,
      type: file.type as QuestionType,
      topic: q.topic as Topic,
      difficulty: q.difficulty as Difficulty,
      prepSeconds: q.prepSeconds ?? file.defaults.prepSeconds,
      minSeconds: q.minSeconds ?? file.defaults.minSeconds,
      maxSeconds: q.maxSeconds ?? file.defaults.maxSeconds,
      criteria: (q.criteria ?? file.defaults.criteria) as EvaluationCriterion[],
    } as Question;
  });
}

export const QUESTIONS: Question[] = [
  ...load(readThenSpeak as RawFile),
  ...load(photo as RawFile),
  ...load(speakingSample as RawFile),
];

export const SCENARIOS: InteractiveScenario[] = (interactive.scenarios as unknown as Omit<InteractiveScenario, 'answerSeconds'>[]).map(
  (s) => ({ ...s, answerSeconds: (s as Partial<InteractiveScenario>).answerSeconds ?? interactive.defaults.answerSeconds }),
);

/** Total number of individual prompts, including every interactive-speaking node. */
export const TOTAL_PROMPTS = QUESTIONS.length + SCENARIOS.reduce((n, s) => n + s.nodes.length, 0);

// Duplicate-id guard (helps when adding questions by hand).
{
  const seen = new Set<string>();
  for (const q of QUESTIONS) {
    if (seen.has(q.id)) console.warn(`[questionBank] duplicate question id ${q.id}`);
    seen.add(q.id);
  }
}

export function imageUrl(image: string): string {
  return `${import.meta.env.BASE_URL}images/${image}`;
}

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export interface PickOptions {
  type?: QuestionType | QuestionType[];
  difficulty?: Difficulty | 'any';
  exclude?: Iterable<string>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// When each question/scenario was last shown, so picks rotate through the whole bank
// instead of repeating ones that were shown but never answered.
const SEEN_KEY = 'det-seen-questions';

function loadSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function markSeen(ids: string[]): void {
  try {
    const seen = loadSeen();
    const now = Date.now();
    for (const id of ids) seen[id] = now;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage unavailable (private mode, tests): rotation just falls back to random.
  }
}

/** Shuffles, then puts never-shown / least recently shown items first (ties stay random). */
function leastRecentFirst<T extends { id: string }>(items: T[], seen: Record<string, number>): T[] {
  return shuffle(items).sort((a, b) => (seen[a.id] ?? 0) - (seen[b.id] ?? 0));
}

/**
 * Picks `count` questions, preferring the chosen difficulty and avoiding excluded
 * (recently answered) ids, then the ones shown least recently. Falls back gracefully
 * when the pool is too small. Picked questions are recorded as shown.
 */
export function pickQuestions(count: number, opts: PickOptions = {}): Question[] {
  const types = opts.type ? (Array.isArray(opts.type) ? opts.type : [opts.type]) : undefined;
  const exclude = new Set(opts.exclude ?? []);
  const pool = QUESTIONS.filter((q) => !types || types.includes(q.type));
  const byDiff = (q: Question) => !opts.difficulty || opts.difficulty === 'any' || q.difficulty === opts.difficulty;

  const tiers = [
    pool.filter((q) => byDiff(q) && !exclude.has(q.id)),
    pool.filter((q) => !byDiff(q) && !exclude.has(q.id)),
    pool.filter((q) => byDiff(q) && exclude.has(q.id)),
    pool.filter((q) => !byDiff(q) && exclude.has(q.id)),
  ];
  const seen = loadSeen();
  const result: Question[] = [];
  for (const tier of tiers) {
    for (const q of leastRecentFirst(tier, seen)) {
      if (result.length >= count) break;
      result.push(q);
    }
  }
  markSeen(result.map((q) => q.id));
  return result;
}

export function pickScenario(opts: { difficulty?: Difficulty | 'any'; exclude?: Iterable<string> } = {}): InteractiveScenario {
  const exclude = new Set(opts.exclude ?? []);
  const fits = (s: InteractiveScenario) => !opts.difficulty || opts.difficulty === 'any' || s.difficulty === opts.difficulty;
  const tiers = [
    SCENARIOS.filter((s) => fits(s) && !exclude.has(s.id)),
    SCENARIOS.filter((s) => !exclude.has(s.id)),
    SCENARIOS,
  ];
  const tier = tiers.find((t) => t.length > 0)!;
  const [scenario] = leastRecentFirst(tier, loadSeen());
  markSeen([scenario.id]);
  return scenario;
}

/** Converts a scenario node into a Question so it can be evaluated and stored like any other. */
export function nodeToQuestion(scenario: InteractiveScenario, node: InteractiveNode, answerSeconds = scenario.answerSeconds): Question {
  return {
    id: `${scenario.id}:${node.id}`,
    type: 'interactive',
    text: node.text,
    topic: scenario.topic,
    difficulty: scenario.difficulty,
    prepSeconds: 3,
    minSeconds: Math.min(15, answerSeconds),
    maxSeconds: answerSeconds,
    keywords: node.keywords,
    criteria: ALL_CRITERIA,
  };
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  photo: 'Speak About the Photo',
  'read-then-speak': 'Read, Then Speak',
  interactive: 'Interactive Speaking',
  'speaking-sample': 'Speaking Sample',
};

export const TOPIC_LABELS: Record<Topic, string> = {
  education: 'Education', technology: 'Technology', environment: 'Environment', 'daily-life': 'Daily life',
  travel: 'Travel', work: 'Work', family: 'Family', 'personal-experience': 'Personal experiences',
  society: 'Society', entertainment: 'Entertainment', health: 'Health & lifestyle', 'future-plans': 'Future plans',
};
