import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, GitCompare, History, Trash2 } from 'lucide-react';
import type { Attempt, QuestionType } from '../types';
import { useAttempts, useTests } from '../hooks/useData';
import { clearAllData, deleteAttempt, deleteTest } from '../storage/db';
import { average, CRITERIA, CRITERION_LABELS, dimensionAverages, toDetScore } from '../engines/scoring';
import { TYPE_LABELS } from '../data/questionBank';
import { Badge, Button, Card, ConfirmDialog, DetScore, EmptyState, PageHeader, Segmented, Spinner } from '../components/ui';
import { DimensionBarChart } from '../components/charts';
import { cn, formatDateTime, truncate } from '../utils/format';

type Tab = 'answers' | 'tests' | 'compare';
type Pending = { kind: 'attempt' | 'test'; id: string } | { kind: 'all' } | null;

interface Session { id: string; label: string; attempts: Attempt[]; date: number }

export function HistoryPage() {
  const { data: attempts, loading } = useAttempts();
  const { data: tests } = useTests();
  const [tab, setTab] = useState<Tab>('answers');
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'practice' | 'test'>('all');
  const [pending, setPending] = useState<Pending>(null);
  const [cmpA, setCmpA] = useState('');
  const [cmpB, setCmpB] = useState('');

  const filtered = attempts.filter((a) => (typeFilter === 'all' || a.question.type === typeFilter) && (modeFilter === 'all' || a.mode === modeFilter));

  const sessions = useMemo<Session[]>(() => {
    const map = new Map<string, Attempt[]>();
    for (const a of attempts) map.set(a.sessionId, [...(map.get(a.sessionId) ?? []), a]);
    return [...map.entries()].map(([id, list]) => {
      const date = Math.min(...list.map((a) => a.createdAt));
      const isTest = list[0].mode === 'test';
      return { id, attempts: list, date, label: `${isTest ? 'Full test' : 'Practice'} · ${formatDateTime(date)} · ${list.length} answer${list.length > 1 ? 's' : ''} · score ${toDetScore(average(list.map((a) => a.evaluation.practiceScore)))}/160` };
    }).sort((a, b) => b.date - a.date);
  }, [attempts]);

  const confirm = async () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    if (p.kind === 'attempt') await deleteAttempt(p.id);
    else if (p.kind === 'test') await deleteTest(p.id);
    else await clearAllData();
  };

  if (loading) return <Spinner label="Loading history…" />;

  const sA = sessions.find((s) => s.id === cmpA);
  const sB = sessions.find((s) => s.id === cmpB);
  const dA = sA ? dimensionAverages(sA.attempts) : null;
  const dB = sB ? dimensionAverages(sB.attempts) : null;

  return (
    <>
      <PageHeader
        title="History & Progress"
        subtitle={`${attempts.length} answers · ${tests.length} full tests, stored locally in this browser`}
        action={attempts.length > 0 && <Button variant="outline" onClick={() => setPending({ kind: 'all' })}><Trash2 className="h-4 w-4" /> Delete all data</Button>}
      />

      {attempts.length === 0 ? (
        <EmptyState icon={<History className="h-6 w-6" />} title="No history yet" description="Every answer you submit in Practice or Full Test mode is saved here." action={<Link to="/practice"><Button>Start practising</Button></Link>} />
      ) : (
        <>
          <Segmented className="mb-5" value={tab} onChange={setTab} options={[
            { value: 'answers', label: <><History className="h-4 w-4" /> Answers</> },
            { value: 'tests', label: <><ClipboardCheck className="h-4 w-4" /> Full tests</> },
            { value: 'compare', label: <><GitCompare className="h-4 w-4" /> Compare sessions</> },
          ]} />

          {tab === 'answers' && (
            <Card className="p-0">
              <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as QuestionType | 'all')} className="h-9 px-3 text-sm" aria-label="Filter by task type">
                  <option value="all">All task types</option>
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
                <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as typeof modeFilter)} className="h-9 px-3 text-sm" aria-label="Filter by mode">
                  <option value="all">Practice & test</option>
                  <option value="practice">Practice only</option>
                  <option value="test">Full test only</option>
                </select>
                <span className="ml-auto self-center text-sm text-slate-500">{filtered.length} shown</span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <Link to={`/history/${a.id}`} className="min-w-0 flex-1 hover:opacity-80">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="brand">{TYPE_LABELS[a.question.type]}</Badge>
                        {a.mode === 'test' && <Badge tone="violet">Full test</Badge>}
                        {a.editedTranscript && <Badge tone="amber">Edited</Badge>}
                        {a.recordingId && <Badge>Audio</Badge>}
                        <span className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{a.question.text}</p>
                      <p className="truncate text-sm text-slate-500">{truncate(a.editedTranscript ?? a.originalTranscript, 140) || '(no transcript)'}</p>
                    </Link>
                    <DetScore score={a.evaluation.practiceScore} className="w-10 text-right text-lg" />
                    <button onClick={() => setPending({ kind: 'attempt', id: a.id })} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" aria-label="Delete answer"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === 'tests' && (
            tests.length === 0 ? <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="No full tests yet" action={<Link to="/test"><Button>Take a full test</Button></Link>} /> : (
              <Card className="p-0">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tests.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <Link to={`/test/results/${t.id}`} className="min-w-0 flex-1 hover:opacity-80">
                        <p className="text-sm font-medium">{t.configName}</p>
                        <p className="text-sm text-slate-500">{formatDateTime(t.finishedAt)} · {t.attemptIds.length} answers</p>
                      </Link>
                      <DetScore score={t.overallScore} className="text-lg" />
                      <button onClick={() => setPending({ kind: 'test', id: t.id })} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" aria-label="Delete test"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          )}

          {tab === 'compare' && (
            <Card className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {[{ v: cmpA, set: setCmpA, label: 'Session A' }, { v: cmpB, set: setCmpB, label: 'Session B' }].map(({ v, set, label }) => (
                  <label key={label} className="text-sm font-medium">
                    {label}
                    <select value={v} onChange={(e) => set(e.target.value)} className="mt-1 h-10 w-full px-3 text-sm font-normal">
                      <option value="">Choose a session…</option>
                      {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              {dA && dB && sA && sB ? (
                <>
                  <DimensionBarChart
                    data={CRITERIA.map((c) => ({ label: CRITERION_LABELS[c], a: dA[c], b: dB[c] }))}
                    seriesA="Session A" seriesB="Session B"
                  />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-slate-500"><th className="py-2 font-medium">Metric</th><th className="font-medium">A</th><th className="font-medium">B</th><th className="font-medium">Change</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[
                          ['Score (/160)', toDetScore(average(sA.attempts.map((a) => a.evaluation.practiceScore))), toDetScore(average(sB.attempts.map((a) => a.evaluation.practiceScore)))] as const,
                          ...CRITERIA.map((c) => [CRITERION_LABELS[c], dA[c], dB[c]] as const),
                          ['Words / min', average(sA.attempts.map((a) => a.evaluation.fluency.wordsPerMinute ?? 0)), average(sB.attempts.map((a) => a.evaluation.fluency.wordsPerMinute ?? 0))] as const,
                        ].map(([label, a, b]) => (
                          <tr key={label}><td className="py-2">{label}</td><td className="tabular-nums">{a}</td><td className="tabular-nums">{b}</td>
                            <td className={cn('tabular-nums font-medium', b - a > 0 ? 'text-brand-600 dark:text-brand-400' : b - a < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')}>{b - a > 0 ? '+' : ''}{b - a}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p className="text-sm text-slate-500">Choose two sessions to compare their average scores by skill.</p>}
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        danger
        title={pending?.kind === 'all' ? 'Delete all local practice data?' : pending?.kind === 'test' ? 'Delete this test?' : 'Delete this answer?'}
        description={pending?.kind === 'all'
          ? 'All answers, full test results and recordings stored in this browser will be permanently deleted. Settings are kept. This cannot be undone.'
          : pending?.kind === 'test' ? 'The test result and all its answers and recordings will be permanently deleted.' : 'The answer, its evaluation and recording will be permanently deleted.'}
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
