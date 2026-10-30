import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronRight, CircleCheck, Gauge, Lightbulb, Target, TriangleAlert } from 'lucide-react';
import type { Attempt, TestResult } from '../types';
import { getTest, listAttemptsForTest } from '../storage/db';
import { saveTestResult } from '../services/attempts';
import {
  average, commonMistakes, CRITERIA, CRITERION_LABELS, dimensionAverages, recommendations, scoreColor, strengthsAndWeaknesses,
} from '../engines/scoring';
import { TYPE_LABELS } from '../data/questionBank';
import { Alert, Badge, Button, Card, CardHeader, DetScore, KindBadge, PageHeader, ScoreRing, Spinner } from '../components/ui';
import { DimensionBarChart } from '../components/charts';
import { RecordingPlayer } from '../components/RecordingPlayer';
import { AttemptEditor } from '../components/AttemptEditor';
import { FeedbackPanel, CorrectionDiff } from '../components/FeedbackPanel';
import { cn, formatDateTime, formatSeconds } from '../utils/format';

const dim = (a: Attempt, k: string) => a.evaluation.dimensions.find((d) => d.key === k)?.score ?? 0;

export function TestResultsPage() {
  const { id = '' } = useParams();
  const [test, setTest] = useState<TestResult | null | undefined>(undefined);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTest(id), listAttemptsForTest(id)]).then(([t, a]) => {
      setTest(t ?? null);
      setAttempts(a);
    });
  }, [id]);

  const onAttemptSaved = useCallback(async (updated: Attempt) => {
    const next = attempts.map((a) => (a.id === updated.id ? updated : a));
    setAttempts(next);
    if (test) setTest(await saveTestResult(test, next));
  }, [attempts, test]);

  const stats = useMemo(() => {
    if (!attempts.length) return null;
    const allCorrections = attempts.flatMap((a) => a.evaluation.corrections);
    const repetition = attempts.flatMap((a) => a.evaluation.issues.filter((i) => i.category === 'repetition').map((i) => i.excerpt).filter(Boolean)) as string[];
    const wpms = attempts.map((a) => a.evaluation.fluency.wordsPerMinute).filter((v): v is number => v != null);
    return {
      dims: dimensionAverages(attempts),
      mistakes: commonMistakes(attempts),
      sw: strengthsAndWeaknesses(attempts),
      recs: recommendations(attempts),
      allCorrections,
      grammarIssues: attempts.flatMap((a) => a.evaluation.issues).filter((i) => ['grammar', 'verb-tense', 'article', 'agreement', 'word-choice'].includes(i.category)),
      repeatedWords: [...new Set(repetition)].slice(0, 12),
      avgWpm: wpms.length ? average(wpms) : null,
      fillers: attempts.reduce((n, a) => n + a.evaluation.fluency.fillerCount, 0),
      words: attempts.reduce((n, a) => n + a.evaluation.fluency.wordCount, 0),
      timeUse: average(attempts.map((a) => a.evaluation.fluency.usedTimeRatio * 100)),
      empty: attempts.filter((a) => !(a.editedTranscript ?? a.originalTranscript).trim()).length,
    };
  }, [attempts]);

  if (test === undefined) return <Spinner label="Loading results…" />;
  if (test === null) return <Alert tone="error" title="Test not found">This test result may have been deleted. <Link className="underline" to="/history">Go to history</Link></Alert>;

  return (
    <>
      <PageHeader
        title="Full Test Results"
        subtitle={`${test.configName} · ${formatDateTime(test.finishedAt)} · ${formatSeconds((test.finishedAt - test.startedAt) / 1000)} total`}
        action={<><Link to="/practice"><Button variant="outline"><BookOpen className="h-4 w-4" /> Practice</Button></Link><Link to="/test"><Button>New test</Button></Link></>}
      />

      {stats?.empty ? (
        <Alert tone="warning" title={`${stats.empty} answer${stats.empty > 1 ? 's have' : ' has'} no transcript`} className="mb-5">
          Open those questions below, listen to the recording, type what you said and click “Save & re-evaluate”. Until then they score 0.
        </Alert>
      ) : null}

      {stats && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <Card className="flex flex-col items-center justify-center gap-3 text-center">
              <ScoreRing score={test.overallScore} size={150} label="Overall estimated score" />
              <p className="text-xs text-slate-500">Average of {attempts.length} answers. Unofficial estimate from this app; the real test may score differently.</p>
              <Badge><TriangleAlert className="h-3 w-3" /> Pronunciation assessment unavailable</Badge>
            </Card>
            <Card>
              <CardHeader title="Performance by skill" subtitle="Average across all answers" action={<KindBadge kind="estimate" />} />
              <DimensionBarChart data={CRITERIA.map((c) => ({ label: CRITERION_LABELS[c], a: stats.dims[c] }))} seriesA="Average score" />
            </Card>
          </div>

          {/* Analysis grid */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader title="Grammar analysis" subtitle={`${stats.grammarIssues.length} likely errors detected · score ${stats.dims.grammar}`} />
              {stats.allCorrections.length ? (
                <ul className="space-y-3 text-sm">
                  {stats.allCorrections.slice(0, 6).map((c, i) => <li key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><CorrectionDiff original={c.original} corrected={c.corrected} /></li>)}
                  {stats.allCorrections.length > 6 && <li className="text-slate-500">+ {stats.allCorrections.length - 6} more in the per-question details below.</li>}
                </ul>
              ) : <p className="text-sm text-slate-500">No common error patterns detected.</p>}
            </Card>
            <Card>
              <CardHeader title="Vocabulary analysis" subtitle={`Score ${stats.dims.vocabulary} · ${stats.words} words spoken`} />
              {stats.repeatedWords.length ? (
                <>
                  <p className="mb-2 text-sm">Words you repeated or over-used:</p>
                  <div className="flex flex-wrap gap-1.5">{stats.repeatedWords.map((w) => <Badge key={w} tone="amber">{w}</Badge>)}</div>
                </>
              ) : <p className="text-sm text-slate-500">No heavily repeated words detected.</p>}
              <p className="mt-3 text-sm text-slate-500">{attempts.find((a) => a.evaluation.dimensions.find((d) => d.key === 'vocabulary'))?.evaluation.dimensions.find((d) => d.key === 'vocabulary')?.suggestions[0]}</p>
            </Card>
            <Card>
              <CardHeader icon={<Gauge className="h-4 w-4" />} title="Fluency indicators" action={<KindBadge kind="measured" />} />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-xl font-semibold">{stats.avgWpm ?? '–'}</p><p className="text-xs text-slate-500">avg words/min</p></div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-xl font-semibold">{stats.fillers}</p><p className="text-xs text-slate-500">filler words</p></div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-xl font-semibold">{stats.timeUse}%</p><p className="text-xs text-slate-500">of time used</p></div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Natural conversational speech is about 110–160 words per minute. Measured from transcripts and timers; pauses and rhythm in the audio are not analysed.</p>
            </Card>
            <Card>
              <CardHeader icon={<Target className="h-4 w-4" />} title="Answer relevance" subtitle={`Average ${stats.dims.relevance} (keyword-overlap estimate)`} />
              <ul className="space-y-1.5 text-sm">
                {attempts.filter((a) => dim(a, 'relevance') < 60).slice(0, 5).map((a) => (
                  <li key={a.id} className="flex justify-between gap-3"><span className="truncate">{a.question.text}</span><span className={scoreColor(dim(a, 'relevance'))}>{dim(a, 'relevance')}</span></li>
                ))}
                {attempts.every((a) => dim(a, 'relevance') >= 60) && <li className="text-slate-500">All answers stayed reasonably on topic.</li>}
              </ul>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader icon={<TriangleAlert className="h-4 w-4" />} title="Common mistakes" />
              {stats.mistakes.length ? (
                <ul className="space-y-2 text-sm">{stats.mistakes.slice(0, 6).map((m) => (
                  <li key={m.message} className="flex justify-between gap-2"><span>{m.message}</span><Badge>{m.count}×</Badge></li>
                ))}</ul>
              ) : <p className="text-sm text-slate-500">None detected.</p>}
            </Card>
            <Card>
              <CardHeader icon={<CircleCheck className="h-4 w-4" />} title="Strengths & weaknesses" />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Strengths</p>
              <ul className="mb-3 mt-1 text-sm">{stats.sw.strengths.length ? stats.sw.strengths.map((s) => <li key={s}>✓ {s}</li>) : <li className="text-slate-500">None above 70 yet</li>}</ul>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Weaknesses</p>
              <ul className="mt-1 text-sm">{stats.sw.weaknesses.length ? stats.sw.weaknesses.map((s) => <li key={s}>• {s}</li>) : <li className="text-slate-500">No skill below 70</li>}</ul>
            </Card>
            <Card>
              <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="Recommended next practice" />
              <ul className="space-y-3 text-sm">
                {stats.recs.map((r) => (
                  <li key={r.title}>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-slate-500">{r.detail}</p>
                    {r.type && <Link to={`/practice/${r.type}`} className="mt-1 inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400">Start <ArrowRight className="h-3.5 w-3.5" /></Link>}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Per question */}
          <Card className="p-0">
            <div className="p-5 pb-3"><CardHeader title="Performance by question" subtitle="Click a question to listen, fix the transcript and see full feedback." /></div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {attempts.map((a, i) => (
                <li key={a.id}>
                  <button onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="w-6 text-sm tabular-nums text-slate-400">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Badge tone="brand">{TYPE_LABELS[a.question.type]}</Badge>
                      <p className="mt-1 truncate text-sm">{a.question.text}</p>
                    </div>
                    <span className="hidden text-xs text-slate-500 sm:block">{a.evaluation.fluency.wordCount} words · {formatSeconds(a.durationSeconds)}</span>
                    <DetScore score={a.evaluation.practiceScore} className="w-10 text-right text-lg" />
                    <ChevronRight className={cn('h-4 w-4 text-slate-400 transition-transform', open === a.id && 'rotate-90')} />
                  </button>
                  {open === a.id && (
                    <div className="space-y-5 border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2"><p className="text-sm font-medium">Recording</p><RecordingPlayer recordingId={a.recordingId} /></div>
                        <AttemptEditor key={a.id + (a.editedTranscript ?? '')} attempt={a} onSaved={onAttemptSaved} />
                      </div>
                      <FeedbackPanel evaluation={a.evaluation} originalTranscript={a.originalTranscript} editedTranscript={a.editedTranscript} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
