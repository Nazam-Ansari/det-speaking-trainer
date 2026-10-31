import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Circle, CircleCheck, Dumbbell, Lightbulb, ListChecks, ListTodo, RotateCcw, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useAttempts } from '../hooks/useData';
import { useSettings } from '../hooks/useSettings';
import { average, CRITERIA, CRITERION_LABELS, toDetScore } from '../engines/scoring';
import { WEIGHTS } from '../engines/evaluation/evaluate';
import { CorrectionDiff } from '../components/FeedbackPanel';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Spinner } from '../components/ui';
import { cn } from '../utils/format';
import type { Attempt, Correction, EvaluationCriterion, QuestionType } from '../types';

const RECENT = 20;
const GRAMMAR_CATEGORIES = ['grammar', 'verb-tense', 'article', 'agreement', 'word-choice'];
const MASTERED_KEY = 'det-mastered-corrections';

/** What to do when a dimension is holding the score back, and where to practise it. */
const ADVICE: Record<EvaluationCriterion, { tip: string; type?: QuestionType; to?: string }> = {
  grammar: { tip: 'Do a speaking Grammar Drill on your most common mistake, plus the "Fix it yourself" drill below, every day.', to: '/drill' },
  vocabulary: { tip: 'During prep time, pick 3 precise topic words (e.g. "crowded", "affordable", "essential") and use all of them.', type: 'speaking-sample' },
  fluency: { tip: 'Speak for the full time. Replace "um/uh" with a short silent pause, and keep going instead of restarting sentences.', type: 'speaking-sample' },
  relevance: { tip: 'Start each answer by repeating the key words of the question, then answer it directly.', type: 'read-then-speak' },
  development: { tip: 'Use Point → Reason → Example → Conclusion. Every opinion needs a "because…" and a "for example…". The 3-minute guide shows how to split an answer into parts.', to: '/learn' },
  structure: { tip: 'Join short sentences with "although", "which", "while", "however" — aim for two linked sentences per answer.', type: 'read-then-speak' },
};

/** Practice Score (0–100) needed for a DET-style score, inverse of toDetScore. */
const practiceNeededFor = (det: number) => Math.min(100, Math.ceil((det - 10) / 1.5));

function dimAvg(attempts: Attempt[], key: EvaluationCriterion): number | null {
  const scores = attempts.map((a) => a.evaluation.dimensions.find((d) => d.key === key)?.score).filter((s): s is number => s != null);
  return scores.length ? average(scores) : null;
}

/** Strips a rule-based reason like 'Use "an" before a vowel sound. ("a apple" → "an apple")' down to the rule. */
const reasonKey = (r: string) => r.replace(/\s*\(".*$/, '').trim();

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Fixed drill sentences → when they were fixed. */
type Mastered = Record<string, number>;

function loadMastered(): Mastered {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(MASTERED_KEY) ?? '{}');
    // Older versions stored a plain list of sentences.
    return Array.isArray(raw) ? Object.fromEntries(raw.map((s: string) => [s, 0])) : (raw as Mastered);
  } catch {
    return {};
  }
}

function saveMastered(m: Mastered) {
  try {
    localStorage.setItem(MASTERED_KEY, JSON.stringify(m));
  } catch {
    // Storage unavailable: progress just isn't remembered.
  }
}

// ---------- Daily tasks ----------

interface DailyTask { id: string; title: string; why: string; goal: number; done: number; type?: QuestionType; drill?: boolean }

const LINKERS = ['although', 'even though', 'while', 'whereas', 'which', 'unless', 'however', 'moreover', 'on the other hand', 'as a result', 'therefore', 'in addition'];
const REASONS = ['because', 'since', 'the reason', "that's why", 'that is why', 'so that'];
const EXAMPLES = ['for example', 'for instance', 'such as'];

const textOf = (a: Attempt) => ` ${(a.editedTranscript ?? a.originalTranscript).toLowerCase().replace(/[^a-z' ]+/g, ' ')} `;
const countPhrases = (text: string, list: string[]) => list.filter((p) => text.includes(` ${p} `)).length;
const dimOf = (a: Attempt, key: EvaluationCriterion) => a.evaluation.dimensions.find((d) => d.key === key)?.score;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/**
 * Builds today's tasks from your weak points. Weak points come from answers given before
 * today, so the list stays the same all day; progress is counted from today's answers.
 */
function buildDailyTasks(attempts: Attempt[], deckSize: number, mastered: Mastered): DailyTask[] {
  const today0 = startOfToday();
  const today = attempts.filter((a) => a.createdAt >= today0);
  const before = attempts.filter((a) => a.createdAt < today0).slice(0, RECENT);
  const basis = before.length ? before : attempts.slice(0, RECENT);
  if (!basis.length) return [];
  const doneIf = (goal: number, ok: (a: Attempt) => boolean) => Math.min(goal, today.filter(ok).length);

  const ruleCounts = new Map<string, number>();
  for (const a of basis) for (const c of a.evaluation.corrections) for (const r of c.reasons) ruleCounts.set(reasonKey(r), (ruleCounts.get(reasonKey(r)) ?? 0) + 1);
  const topRule = [...ruleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const byDim: Record<EvaluationCriterion, DailyTask> = {
    grammar: topRule
      ? { id: 'grammar', title: `Give 2 answers (30+ words) without this mistake: “${topRule}”`, why: 'This is the grammar mistake you make most often.', goal: 2, done: doneIf(2, (a) => a.evaluation.fluency.wordCount >= 30 && !a.evaluation.corrections.some((c) => c.reasons.some((r) => reasonKey(r) === topRule))) }
      : { id: 'grammar', title: 'Give 2 answers with a Grammar score of 75+', why: 'Grammar is one of your weakest skills.', goal: 2, done: doneIf(2, (a) => (dimOf(a, 'grammar') ?? 0) >= 75) },
    vocabulary: { id: 'vocabulary', title: 'Give 2 answers with a Vocabulary score of 70+', why: 'Use precise words instead of "good", "nice", "very big".', goal: 2, done: doneIf(2, (a) => (dimOf(a, 'vocabulary') ?? 0) >= 70), type: 'speaking-sample' },
    fluency: { id: 'fluency', title: 'Give 2 answers of 60+ words with at most 2 filler words (um, uh, like…)', why: 'Fillers and stops lower your fluency score.', goal: 2, done: doneIf(2, (a) => a.evaluation.fluency.wordCount >= 60 && a.evaluation.fluency.fillerCount <= 2), type: 'speaking-sample' },
    relevance: { id: 'relevance', title: 'Do 2 Read, Then Speak answers with a Relevance score of 70+', why: 'Answer exactly what the question asks.', goal: 2, done: doneIf(2, (a) => a.question.type === 'read-then-speak' && (dimOf(a, 'relevance') ?? 0) >= 70), type: 'read-then-speak' },
    development: { id: 'development', title: 'Give 2 answers that use a reason (“because…”) and an example (“for example…”)', why: 'Developed answers with reasons and examples score higher.', goal: 2, done: doneIf(2, (a) => countPhrases(textOf(a), REASONS) > 0 && countPhrases(textOf(a), EXAMPLES) > 0), type: 'speaking-sample' },
    structure: { id: 'structure', title: 'Give 2 answers with at least 2 linking words (although, however, which, while…)', why: 'Linked, longer sentences show grammar range.', goal: 2, done: doneIf(2, (a) => countPhrases(textOf(a), LINKERS) >= 2), type: 'read-then-speak' },
  };

  const tasks: DailyTask[] = [];
  const shortShare = basis.filter((a) => a.evaluation.issues.some((i) => i.category === 'length')).length / basis.length;
  if (shortShare >= 0.3) {
    tasks.push({ id: 'length', title: 'Give 3 answers that use at least 80% of the speaking time', why: `${Math.round(shortShare * 100)}% of your answers were too short, which caps the score.`, goal: 3, done: doneIf(3, (a) => a.evaluation.fluency.usedTimeRatio >= 0.8), type: 'speaking-sample' });
  }
  if (deckSize > 0) {
    const goal = Math.min(5, deckSize);
    const fixedToday = Object.values(mastered).filter((t) => t >= today0).length;
    tasks.push({ id: 'drill', title: `Fix ${goal} of your own sentences in “Fix it yourself”`, why: 'Correcting your own mistakes is the fastest way to stop making them.', goal, done: Math.min(goal, fixedToday), drill: true });
  }
  const weakest = CRITERIA.map((k) => [k, dimAvg(basis, k)] as const).filter(([, v]) => v != null).sort((a, b) => a[1]! - b[1]!);
  for (const [k] of weakest) {
    if (tasks.length >= 4) break;
    tasks.push(byDim[k]);
  }
  return tasks;
}

function DailyTasks({ tasks }: { tasks: DailyTask[] }) {
  const finished = tasks.filter((t) => t.done >= t.goal).length;
  const all = finished === tasks.length;
  return (
    <Card className={cn(all && 'border-brand-300 dark:border-brand-800')}>
      <CardHeader
        icon={<ListTodo className="h-4 w-4" />}
        title="Today's tasks"
        subtitle={all ? 'All done for today — great work! New tasks tomorrow.' : 'Picked from your weak points. They tick off automatically as you practise.'}
        action={<Badge tone={all ? 'brand' : 'neutral'}>{finished}/{tasks.length} done</Badge>}
      />
      <ul className="space-y-3">
        {tasks.map((t) => {
          const done = t.done >= t.goal;
          return (
            <li key={t.id} className={cn('flex gap-3 rounded-xl border p-3', done ? 'border-brand-200 bg-brand-50/60 dark:border-brand-900 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-800')}>
              {done ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />}
              <div className="min-w-0 flex-1">
                <p className={cn('font-medium', done && 'text-slate-500 line-through decoration-brand-400')}>{t.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.why}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-xs tabular-nums text-slate-500">{t.done}/{t.goal}</span>
                  <div className="w-24"><ProgressBar value={(t.done / t.goal) * 100} colorByScore={false} /></div>
                  {!done && (t.drill
                    ? <a href="#fix-it" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Go to drill <ArrowRight className="h-3.5 w-3.5" /></a>
                    : <Link to={`/practice/${t.type ?? 'random'}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Start <ArrowRight className="h-3.5 w-3.5" /></Link>)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function ImprovePage() {
  const { data: attempts, loading } = useAttempts();
  const { settings } = useSettings();
  const target = settings.targetScore;

  const s = useMemo(() => {
    const recent = attempts.slice(0, RECENT);
    const older = attempts.slice(RECENT, RECENT * 2);
    const current = toDetScore(average(recent.map((a) => a.evaluation.practiceScore)));
    const need = practiceNeededFor(target);

    // How many DET points each dimension would add if it reached the level the target needs.
    const dims = CRITERIA.map((key) => {
      const cur = dimAvg(recent, key);
      const gain = cur == null ? 0 : Math.round(Math.max(0, need - cur) * WEIGHTS[key] * 1.5);
      return { key, cur, gain };
    }).filter((d) => d.cur != null).sort((a, b) => b.gain - a.gain);

    const shortShare = recent.length ? recent.filter((a) => a.evaluation.issues.some((i) => i.category === 'length')).length / recent.length : 0;

    // Recurring grammar mistakes: recent count vs the previous block of attempts.
    const groups = new Map<string, { rule: string; recent: number; older: number; examples: Correction[] }>();
    const countIn = (list: Attempt[], field: 'recent' | 'older') => {
      for (const a of list) {
        for (const c of a.evaluation.corrections) {
          for (const r of c.reasons) {
            const rule = reasonKey(r);
            const g = groups.get(rule) ?? { rule, recent: 0, older: 0, examples: [] };
            g[field]++;
            if (field === 'recent' && g.examples.length < 3 && !g.examples.some((e) => e.original === c.original)) g.examples.push(c);
            groups.set(rule, g);
          }
        }
      }
    };
    countIn(recent, 'recent');
    countIn(older, 'older');
    const mistakes = [...groups.values()].filter((g) => g.recent > 0).sort((a, b) => b.recent - a.recent).slice(0, 6);

    const grammarIssues = recent.reduce((n, a) => n + a.evaluation.issues.filter((i) => GRAMMAR_CATEGORIES.includes(i.category)).length, 0);
    const words = recent.reduce((n, a) => n + a.evaluation.fluency.wordCount, 0);

    // Drill deck: every distinct sentence that needed a correction, newest first.
    const seen = new Set<string>();
    const deck: Correction[] = [];
    for (const a of attempts.slice(0, 60)) {
      for (const c of a.evaluation.corrections) {
        if (seen.has(c.original) || normalize(c.original) === normalize(c.corrected)) continue;
        seen.add(c.original);
        deck.push(c);
      }
    }

    return { recent, current, need, dims, shortShare, mistakes, deck, errorsPer100: words ? Math.round((grammarIssues / words) * 1000) / 10 : 0, usesAi: recent.some((a) => a.evaluation.ai) };
  }, [attempts, target]);

  const [mastered, setMastered] = useState(loadMastered);
  const updateMastered = (m: Mastered) => { setMastered(m); saveMastered(m); };
  const tasks = useMemo(() => buildDailyTasks(attempts, s.deck.length, mastered), [attempts, s.deck.length, mastered]);

  if (loading) return <Spinner label="Loading your mistakes…" />;
  if (!attempts.length) {
    return (
      <EmptyState
        icon={<Target className="h-6 w-6" />}
        title="No answers yet"
        description="Answer a few questions first. This page then shows your repeated mistakes and what to work on to reach your target."
        action={<Link to="/practice"><Button>Start practising</Button></Link>}
      />
    );
  }

  const gap = target - s.current;
  const plan = [
    ...(s.shortShare >= 0.3 ? [{ title: 'Speak for longer first', detail: `${Math.round(s.shortShare * 100)}% of your recent answers were too short. Short answers are capped at a low score no matter how good the grammar is, so fix this first.`, type: 'speaking-sample' as QuestionType, to: '/learn' as string | undefined, gain: null as number | null }] : []),
    ...s.dims.filter((d) => d.gain > 0).slice(0, 3).map((d) => ({ title: `Improve ${CRITERION_LABELS[d.key].toLowerCase()}`, detail: ADVICE[d.key].tip, type: ADVICE[d.key].type, to: ADVICE[d.key].to, gain: d.gain })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Improve" subtitle={`Your repeated mistakes and a plan to reach ${target}, based on your last ${s.recent.length} answers.`} />

      {tasks.length > 0 && <DailyTasks tasks={tasks} />}

      {/* Score gap */}
      <Card>
        <CardHeader icon={<Target className="h-4 w-4" />} title={`Your path to ${target}`} subtitle="Estimated by this app, not an official Duolingo score." />
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-center"><p className="text-3xl font-bold tabular-nums">{s.current}</p><p className="text-xs text-slate-500">now (average)</p></div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
          <div className="text-center"><p className="text-3xl font-bold tabular-nums text-brand-600">{target}</p><p className="text-xs text-slate-500">target</p></div>
          <Badge tone={gap > 0 ? 'amber' : 'brand'} className="ml-auto">{gap > 0 ? `${gap} points to go` : 'Target reached — keep it steady!'}</Badge>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          To score {target}, each skill should be around <strong>{s.need}/100</strong>. These are the skills holding you back, and roughly how many points each could add:
        </p>
        <ul className="mt-3 space-y-3">
          {s.dims.map((d) => (
            <li key={d.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{CRITERION_LABELS[d.key]}</span>
                <span className="tabular-nums text-slate-500">{d.cur}/100 {d.gain > 0 ? <span className="font-semibold text-amber-600">· up to +{d.gain}</span> : <span className="text-brand-600">· on target</span>}</span>
              </div>
              <div className="relative">
                <ProgressBar value={d.cur ?? 0} />
                <span className="absolute -top-1 h-4 w-0.5 bg-slate-900 dark:bg-white" style={{ left: `${s.need}%` }} title={`Needed for ${target}`} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Plan */}
      {plan.length > 0 && (
        <Card>
          <CardHeader icon={<ListChecks className="h-4 w-4" />} title="What to do next" subtitle="In this order — the biggest gains first." />
          <ol className="space-y-3">
            {plan.map((p, i) => (
              <li key={p.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.title} {p.gain ? <span className="text-sm font-normal text-amber-600">(up to +{p.gain})</span> : null}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{p.detail}</p>
                  {(p.to ?? p.type) && <Link to={p.to ?? `/practice/${p.type}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Practise now <ArrowRight className="h-3.5 w-3.5" /></Link>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Recurring mistakes */}
      <Card>
        <CardHeader
          icon={<Lightbulb className="h-4 w-4" />}
          title="Mistakes you keep making"
          subtitle={`${s.errorsPer100} grammar mistakes per 100 words in your recent answers. Under 2 is a good level for ${target}+.`}
          action={<Link to="/drill"><Button variant="outline" size="sm">Practise by speaking <ArrowRight className="h-3.5 w-3.5" /></Button></Link>}
        />
        {!s.usesAi && (
          <Alert tone="info" className="mb-4">
            These come from the offline checker, which only catches common patterns (articles, tenses, he/she + verb…). It can miss mistakes and is sometimes wrong. Turn on the free AI coach in Settings for a more complete check.
          </Alert>
        )}
        {s.mistakes.length ? (
          <ul className="space-y-4">
            {s.mistakes.map((m) => {
              const trend = m.older ? (m.recent < m.older ? 'down' : m.recent > m.older ? 'up' : 'same') : null;
              return (
                <li key={m.rule} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{m.rule}</p>
                    <Badge tone="rose">{m.recent}×</Badge>
                    {trend === 'down' && <Badge tone="brand"><TrendingDown className="h-3 w-3" /> fewer than before</Badge>}
                    {trend === 'up' && <Badge tone="amber"><TrendingUp className="h-3 w-3" /> more than before</Badge>}
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {m.examples.map((e) => <li key={e.original} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><CorrectionDiff original={e.original} corrected={e.corrected} /></li>)}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-slate-500">No grammar mistakes found in your recent answers. 🎉</p>}
      </Card>

      <div id="fix-it" className="scroll-mt-20"><FixItDrill deck={s.deck} mastered={mastered} onMasteredChange={updateMastered} /></div>
    </div>
  );
}

/** Shows one of your own wrong sentences; you type the fix and check it. */
function FixItDrill({ deck, mastered, onMasteredChange }: { deck: Correction[]; mastered: Mastered; onMasteredChange: (m: Mastered) => void }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'right' | 'wrong' | null>(null);
  // Keeps a just-fixed sentence on screen (it has already left the to-do list) until "Next".
  const [pinned, setPinned] = useState<Correction | null>(null);

  const todo = deck.filter((c) => !(c.original in mastered));
  const card = pinned ?? (todo.length ? todo[index % todo.length] : null);

  const next = () => {
    // A fixed sentence left the list, so the same index already points at the next one.
    if (pinned) setPinned(null);
    else setIndex((i) => i + 1);
    setInput('');
    setResult(null);
  };
  const check = () => {
    if (!card) return;
    const ok = normalize(input) === normalize(card.corrected);
    setResult(ok ? 'right' : 'wrong');
    if (ok) {
      setPinned(card);
      onMasteredChange({ ...mastered, [card.original]: Date.now() });
    }
  };
  const reset = () => { onMasteredChange({}); setPinned(null); setIndex(0); setInput(''); setResult(null); };

  const done = deck.length - todo.length;

  return (
    <Card>
      <CardHeader
        icon={<Dumbbell className="h-4 w-4" />}
        title="Fix it yourself"
        subtitle="Your own sentences that had mistakes. Type the correct version — fixing it yourself is how the mistake goes away."
        action={done > 0 ? <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button> : undefined}
      />
      {deck.length > 0 && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{done} of {deck.length} fixed</span></div>
          <ProgressBar value={(done / deck.length) * 100} colorByScore={false} />
        </div>
      )}
      {!card ? (
        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <CircleCheck className="h-4 w-4 text-brand-600" />
          {deck.length ? 'You have fixed every sentence. New ones appear after your next practice answers.' : 'No sentences to fix yet. They appear here after an answer has corrections.'}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl bg-rose-50 p-3 text-[15px] dark:bg-rose-950/40">{card.original}</p>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.trim()) check(); } }}
            rows={2}
            placeholder="Type the corrected sentence…"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-[15px] focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
          {result === 'right' && <Alert tone="success" title="Correct!">This counts towards today's tasks.</Alert>}
          {result === 'wrong' && (
            <div className={cn('space-y-2 rounded-xl border border-amber-200 p-3 text-sm dark:border-amber-900')}>
              <p className="font-medium text-amber-700 dark:text-amber-300">Not quite. The correct sentence:</p>
              <CorrectionDiff original={card.original} corrected={card.corrected} />
              <ul className="text-slate-600 dark:text-slate-400">{card.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={check} disabled={!input.trim() || result === 'right'}>Check</Button>
            <Button variant="outline" onClick={next}>{result ? 'Next sentence' : 'Skip'}</Button>
            {result === null && <Button variant="ghost" onClick={() => setResult('wrong')}>Show answer</Button>}
          </div>
        </div>
      )}
    </Card>
  );
}
