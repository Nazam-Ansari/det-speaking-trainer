import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, Dumbbell, Lightbulb, ListChecks, RotateCcw, Target, TrendingDown, TrendingUp } from 'lucide-react';
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
const ADVICE: Record<EvaluationCriterion, { tip: string; type?: QuestionType }> = {
  grammar: { tip: 'Do the "Fix it yourself" drill below every day, then re-record answers using the corrected sentences.' },
  vocabulary: { tip: 'During prep time, pick 3 precise topic words (e.g. "crowded", "affordable", "essential") and use all of them.', type: 'speaking-sample' },
  fluency: { tip: 'Speak for the full time. Replace "um/uh" with a short silent pause, and keep going instead of restarting sentences.', type: 'speaking-sample' },
  relevance: { tip: 'Start each answer by repeating the key words of the question, then answer it directly.', type: 'read-then-speak' },
  development: { tip: 'Use Point → Reason → Example → Conclusion. Every opinion needs a "because…" and a "for example…".', type: 'speaking-sample' },
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

function loadMastered(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(MASTERED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function saveMastered(s: Set<string>) {
  try {
    localStorage.setItem(MASTERED_KEY, JSON.stringify([...s]));
  } catch {
    // Storage unavailable: progress just isn't remembered.
  }
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
    ...(s.shortShare >= 0.3 ? [{ title: 'Speak for longer first', detail: `${Math.round(s.shortShare * 100)}% of your recent answers were too short. Short answers are capped at a low score no matter how good the grammar is, so fix this first.`, type: 'speaking-sample' as QuestionType, gain: null as number | null }] : []),
    ...s.dims.filter((d) => d.gain > 0).slice(0, 3).map((d) => ({ title: `Improve ${CRITERION_LABELS[d.key].toLowerCase()}`, detail: ADVICE[d.key].tip, type: ADVICE[d.key].type, gain: d.gain })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Improve" subtitle={`Your repeated mistakes and a plan to reach ${target}, based on your last ${s.recent.length} answers.`} />

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
                  {p.type && <Link to={`/practice/${p.type}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Practise now <ArrowRight className="h-3.5 w-3.5" /></Link>}
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

      <FixItDrill deck={s.deck} />
    </div>
  );
}

/** Shows one of your own wrong sentences; you type the fix and check it. */
function FixItDrill({ deck }: { deck: Correction[] }) {
  const [mastered, setMastered] = useState(loadMastered);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'right' | 'wrong' | null>(null);

  const todo = deck.filter((c) => !mastered.has(c.original));
  const card = todo.length ? todo[index % todo.length] : null;

  const next = () => {
    if (card && result === 'right') {
      // The fixed sentence leaves the list, so the same index now points at the next one.
      const m = new Set(mastered).add(card.original);
      setMastered(m);
      saveMastered(m);
    } else {
      setIndex((i) => i + 1);
    }
    setInput('');
    setResult(null);
  };
  const check = () => {
    if (card) setResult(normalize(input) === normalize(card.corrected) ? 'right' : 'wrong');
  };
  const reset = () => { const m = new Set<string>(); setMastered(m); saveMastered(m); setIndex(0); setInput(''); setResult(null); };

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
          {result === 'right' && <Alert tone="success" title="Correct!">Press "Next sentence" to continue.</Alert>}
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
