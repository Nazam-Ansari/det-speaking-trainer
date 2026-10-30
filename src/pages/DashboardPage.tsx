import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BookOpen, ClipboardCheck, Flame, Gauge, History, ListChecks, Target, TrendingDown, TrendingUp, Trophy, TriangleAlert,
} from 'lucide-react';
import { useAttempts, useTests } from '../hooks/useData';
import { useSettings } from '../hooks/useSettings';
import { average, commonMistakes, CRITERIA, CRITERION_LABELS, dimensionAverages, scoreColor, toDetScore } from '../engines/scoring';
import { TYPE_LABELS } from '../data/questionBank';
import { Badge, Button, Card, CardHeader, DetScore, EmptyState, KindBadge, ProgressBar, Spinner, StatCard } from '../components/ui';
import { CountBarChart, ScoreLineChart } from '../components/charts';
import { cn, dayKey, formatDate, relativeTime, truncate } from '../utils/format';
import type { Attempt } from '../types';

function Trend({ now, before }: { now: number; before: number | null }) {
  if (before == null) return null;
  const diff = now - before;
  if (Math.abs(diff) < 1) return <span className="text-xs text-slate-400">no change</span>;
  const Up = diff > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', Up ? 'text-brand-600 dark:text-brand-400' : 'text-rose-600 dark:text-rose-400')}>
      {Up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} {Up ? '+' : ''}{diff}
    </span>
  );
}

function dimAvg(attempts: Attempt[], key: string) {
  return average(attempts.map((a) => a.evaluation.dimensions.find((d) => d.key === key)?.score ?? 0));
}

export function DashboardPage() {
  const { settings } = useSettings();
  const { data: attempts, loading } = useAttempts();
  const { data: tests } = useTests();

  const s = useMemo(() => {
    const practice = attempts.filter((a) => a.mode === 'practice');
    const sessions = new Set(practice.map((a) => a.sessionId)).size;
    const best = practice.reduce<Attempt | null>((b, a) => (!b || a.evaluation.practiceScore > b.evaluation.practiceScore ? a : b), null);

    // Progress: daily average Practice Score (practice mode), oldest → newest.
    const byDay = new Map<string, number[]>();
    for (const a of [...practice].reverse()) byDay.set(dayKey(a.createdAt), [...(byDay.get(dayKey(a.createdAt)) ?? []), a.evaluation.practiceScore]);
    const progress = [...byDay.entries()].slice(-30).map(([k, v]) => ({ label: new Date(`${k}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value: toDetScore(average(v)) }));

    // Activity: last 14 days.
    const counts = new Map<string, number>();
    for (const a of attempts) counts.set(dayKey(a.createdAt), (counts.get(dayKey(a.createdAt)) ?? 0) + 1);
    const activity = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), value: counts.get(dayKey(d.getTime())) ?? 0 };
    });
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (counts.get(dayKey(d.getTime()))) streak++;
      else if (i > 0) break;
      if (i > 365) break;
    }

    const recent = attempts.slice(0, 20);
    const previous = attempts.slice(20, 40);
    const wpms = recent.map((a) => a.evaluation.fluency.wordsPerMinute).filter((v): v is number => v != null);
    const recentWords = recent.reduce((n, a) => n + a.evaluation.fluency.wordCount, 0);
    const recentFillers = recent.reduce((n, a) => n + a.evaluation.fluency.fillerCount, 0);
    const dims = dimensionAverages(recent);
    const weakest = [...CRITERIA].sort((a, b) => dims[a] - dims[b]).slice(0, 2);

    return {
      practice, sessions, best, progress, activity, streak, recent, previous, dims, weakest,
      grammar: dimAvg(recent, 'grammar'), grammarPrev: previous.length ? dimAvg(previous, 'grammar') : null,
      vocab: dimAvg(recent, 'vocabulary'), vocabPrev: previous.length ? dimAvg(previous, 'vocabulary') : null,
      wpm: wpms.length ? average(wpms) : null,
      fillersPer100: recentWords ? Math.round((recentFillers / recentWords) * 1000) / 10 : 0,
      timeUse: average(recent.map((a) => a.evaluation.fluency.usedTimeRatio * 100)),
      mistakes: commonMistakes(recent, 5),
      today: counts.get(dayKey(Date.now())) ?? 0,
    };
  }, [attempts]);

  if (loading) return <Spinner label="Loading your progress…" />;
  const empty = attempts.length === 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-lg shadow-brand-900/10 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-100">Duolingo English Test · Speaking</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Target: {settings.targetScore}+</h1>
            <p className="mt-2 max-w-lg text-brand-50/90">
              {empty ? 'Welcome! Start with a few practice questions to build your baseline.' : s.today ? `${s.today} answer${s.today > 1 ? 's' : ''} today. Keep the momentum going.` : 'No practice yet today. A short session keeps your speaking sharp.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/practice"><Button size="lg" variant="inverse"><BookOpen className="h-5 w-5" /> Start Practice</Button></Link>
            <Link to="/test"><Button size="lg" variant="inverse-outline"><ClipboardCheck className="h-5 w-5" /> Start Full Test</Button></Link>
            <Link to="/history"><Button size="lg" variant="inverse-outline" className="border-transparent"><History className="h-5 w-5" /> View History</Button></Link>
          </div>
        </div>
      </div>

      {empty ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="No practice data yet"
          description="Your statistics, charts and weakness analysis will appear here after you answer your first questions."
          action={<Link to="/practice"><Button>Answer your first question <ArrowRight className="h-4 w-4" /></Button></Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Target className="h-5 w-5" />} label="Target DET score" value={`${settings.targetScore}+`} hint="Official scale 10–160" />
            <StatCard icon={<ListChecks className="h-5 w-5" />} label="Practice sessions" value={s.sessions} hint={`${tests.length} full test${tests.length === 1 ? '' : 's'}`} />
            <StatCard icon={<Activity className="h-5 w-5" />} label="Questions answered" value={attempts.length} hint={`${s.streak} day streak`} />
            <StatCard icon={<Trophy className="h-5 w-5" />} label="Best score (est.)" value={s.best ? `${toDetScore(s.best.evaluation.practiceScore)}/160` : '–'} hint={s.best ? TYPE_LABELS[s.best.question.type] : 'Practice Mode only'} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Practice progress" subtitle="Daily average estimated score (out of 160)" action={<KindBadge kind="estimate" />} />
              {s.progress.length >= 2 ? <ScoreLineChart data={s.progress} max={160} target={settings.targetScore} valueLabel="Estimated score" /> : (
                <p className="py-16 text-center text-sm text-slate-500">Practise on at least two different days to see a trend.</p>
              )}
            </Card>
            <Card>
              <CardHeader icon={<Flame className="h-4 w-4" />} title="Daily activity" subtitle={`Last 14 days · ${s.streak} day streak`} />
              <CountBarChart data={s.activity} valueLabel="Answers" />
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader title="Grammar" subtitle="Last 20 answers vs the 20 before" action={<KindBadge kind="estimate" />} />
              <div className="flex items-end gap-3"><span className={cn('text-4xl font-bold tabular-nums', scoreColor(s.grammar))}>{s.grammar}</span><Trend now={s.grammar} before={s.grammarPrev} /></div>
              <ProgressBar value={s.grammar} className="mt-3" />
            </Card>
            <Card>
              <CardHeader title="Vocabulary" subtitle="Last 20 answers vs the 20 before" action={<KindBadge kind="estimate" />} />
              <div className="flex items-end gap-3"><span className={cn('text-4xl font-bold tabular-nums', scoreColor(s.vocab))}>{s.vocab}</span><Trend now={s.vocab} before={s.vocabPrev} /></div>
              <ProgressBar value={s.vocab} className="mt-3" />
            </Card>
            <Card>
              <CardHeader icon={<Gauge className="h-4 w-4" />} title="Fluency indicators" subtitle="Last 20 answers" action={<KindBadge kind="measured" />} />
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div><dt className="text-xs text-slate-500">words/min</dt><dd className="text-xl font-semibold tabular-nums">{s.wpm ?? '–'}</dd></div>
                <div><dt className="text-xs text-slate-500">fillers/100w</dt><dd className="text-xl font-semibold tabular-nums">{s.fillersPer100}</dd></div>
                <div><dt className="text-xs text-slate-500">time used</dt><dd className="text-xl font-semibold tabular-nums">{s.timeUse}%</dd></div>
              </dl>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader icon={<TriangleAlert className="h-4 w-4" />} title="Weakness analysis" subtitle="Based on your last 20 answers" />
              <div className="mb-4 space-y-2">
                {CRITERIA.map((c) => (
                  <div key={c} className="flex items-center gap-3 text-sm">
                    <span className={cn('w-36 shrink-0', s.weakest.includes(c) && 'font-semibold')}>{CRITERION_LABELS[c]}</span>
                    <ProgressBar value={s.dims[c]} />
                    <span className="w-8 text-right tabular-nums text-slate-500">{s.dims[c]}</span>
                  </div>
                ))}
              </div>
              {s.mistakes.length > 0 && (
                <>
                  <p className="mb-2 text-sm font-medium">Most frequent issues</p>
                  <ul className="space-y-1.5 text-sm">
                    {s.mistakes.map((m) => <li key={m.message} className="flex justify-between gap-3"><span className="text-slate-600 dark:text-slate-300">{truncate(m.message, 80)}</span><Badge>{m.count}×</Badge></li>)}
                  </ul>
                </>
              )}
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Recent practice" action={<Link to="/history" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">All history</Link>} />
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {s.recent.slice(0, 5).map((a) => (
                    <li key={a.id}>
                      <Link to={`/history/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                        <div className="min-w-0">
                          <p className="truncate text-sm">{a.question.text}</p>
                          <p className="text-xs text-slate-500">{TYPE_LABELS[a.question.type]} · {relativeTime(a.createdAt)}{a.mode === 'test' && ' · test'}</p>
                        </div>
                        <DetScore score={a.evaluation.practiceScore} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader icon={<ClipboardCheck className="h-4 w-4" />} title="Recent full tests" />
                {tests.length === 0 ? (
                  <p className="text-sm text-slate-500">No full tests yet. <Link to="/test" className="font-medium text-brand-600 hover:underline dark:text-brand-400">Take one</Link> when you feel ready.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tests.slice(0, 3).map((t) => (
                      <li key={t.id}>
                        <Link to={`/test/results/${t.id}`} className="flex items-center justify-between py-2.5 hover:opacity-80">
                          <span className="text-sm">{formatDate(t.finishedAt)} · {t.attemptIds.length} answers</span>
                          <DetScore score={t.overallScore} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
