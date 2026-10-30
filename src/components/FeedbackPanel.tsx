import { useState } from 'react';
import { BookMarked, Bot, ChevronDown, CircleCheck, Ear, Gauge, Lightbulb, Quote, Wand2 } from 'lucide-react';
import type { Evaluation, Issue } from '../types';
import { Alert, Badge, Button, Card, CardHeader, KindBadge, ProgressBar, ScoreRing } from './ui';
import { diffWords } from '../utils/diff';
import { cn } from '../utils/format';
import { scoreColor } from '../engines/scoring';

const ISSUE_LABELS: Record<Issue['category'], string> = {
  grammar: 'Grammar', 'verb-tense': 'Verb tense', article: 'Article', agreement: 'Agreement', 'word-choice': 'Word choice',
  repetition: 'Repetition', filler: 'Filler words', structure: 'Structure', length: 'Length', relevance: 'Relevance',
};

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function CorrectionDiff({ original, corrected }: { original: string; corrected: string }) {
  const parts = diffWords(original, corrected);
  return (
    <p className="leading-relaxed">
      {parts.map((p, i) => (
        <span
          key={i}
          className={cn(
            p.type === 'removed' && 'rounded bg-rose-100 px-0.5 text-rose-700 line-through decoration-rose-400 dark:bg-rose-950/60 dark:text-rose-300',
            p.type === 'added' && 'rounded bg-brand-100 px-0.5 font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-300',
          )}
        >
          {p.text}{' '}
        </span>
      ))}
    </p>
  );
}

export function FeedbackPanel({ evaluation: e, originalTranscript, editedTranscript }: { evaluation: Evaluation; originalTranscript: string; editedTranscript: string | null }) {
  const [details, setDetails] = useState(false);
  const answer = editedTranscript ?? originalTranscript;
  const otherIssues = e.issues.filter((i) => !['grammar', 'verb-tense', 'article', 'agreement', 'word-choice'].includes(i.category));
  const f = e.fluency;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score + top tips */}
      <Card>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreRing score={e.practiceScore} size={128} />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Your score</h2>
              <Badge tone="violet" title="Estimated by this app. The real Duolingo English Test may score differently.">Unofficial estimate</Badge>
              {e.ai
                ? <Badge tone="sky" title={`Feedback written by ${e.ai.model}`}><Bot className="h-3 w-3" /> AI coach · {e.ai.provider === 'gemini' ? 'Gemini' : 'Groq'}</Badge>
                : <Badge title="Feedback from the built-in offline rule engine">Offline rules</Badge>}
              {!e.ai?.pronunciationNotes && <Badge title="Pronunciation cannot be judged from a transcript">Pronunciation not scored</Badge>}
            </div>
            {e.aiError && (
              <Alert tone="warning" title="AI feedback failed, showing offline feedback">{e.aiError}</Alert>
            )}
            <ol className="space-y-1.5 text-sm">
              {e.tips.slice(0, 3).map((t, i) => (
                <li key={t} className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
        </div>
      </Card>

      {/* Your answer vs corrected answer */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader icon={<Quote className="h-4 w-4" />} title="Your answer" subtitle={editedTranscript ? 'Edited transcript' : undefined} />
          <p className="whitespace-pre-wrap leading-relaxed">{answer || <em className="text-slate-400">No transcript</em>}</p>
        </Card>
        <Card className="border-brand-200 dark:border-brand-900">
          <CardHeader icon={<Wand2 className="h-4 w-4" />} title="Corrected answer" subtitle={e.corrections.length ? `${e.corrections.length} correction${e.corrections.length > 1 ? 's' : ''} highlighted` : 'No common mistakes found'} />
          {answer ? <CorrectionDiff original={answer} corrected={e.polishedVersion} /> : <em className="text-slate-400">Nothing to correct.</em>}
        </Card>
      </div>

      {e.ai?.pronunciationNotes && (
        <Card>
          <CardHeader icon={<Ear className="h-4 w-4" />} title="AI listening feedback" subtitle="The AI's opinion after hearing your recording. An estimate, not a measured pronunciation score." />
          <p className="text-sm leading-relaxed">{e.ai.pronunciationNotes}</p>
        </Card>
      )}

      {e.corrections.length > 0 && (
        <Card>
          <CardHeader title="Why it was corrected" />
          <ul className="space-y-1.5 text-sm">
            {[...new Set(e.issues.filter((i) => ['grammar', 'verb-tense', 'article', 'agreement', 'word-choice'].includes(i.category)).map((i) => i.message))].map((m) => (
              <li key={m} className="flex gap-2"><span className="text-rose-500">•</span>{m}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => setDetails((v) => !v)}>
          {details ? 'Hide full details' : 'Show full details'} <ChevronDown className={cn('h-4 w-4 transition-transform', details && 'rotate-180')} />
        </Button>
      </div>

      {details && (
        <div className="space-y-5 animate-fade-in">
          <Card>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Gauge className="h-4 w-4 text-slate-400" /> Fluency indicators <KindBadge kind="measured" /></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Metric label="Words / min" value={f.wordsPerMinute ?? '–'} hint="natural ≈ 110–160" />
              <Metric label="Words" value={f.wordCount} />
              <Metric label="Speaking time" value={`${f.speakingSeconds}s`} hint={`${Math.round(f.usedTimeRatio * 100)}% of limit`} />
              <Metric label="Fillers" value={f.fillerCount} hint={Object.keys(f.fillerWords).slice(0, 3).join(', ') || undefined} />
              <Metric label="Avg sentence" value={`${f.avgSentenceLength} w`} hint={`${f.sentenceCount} sentences`} />
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {e.dimensions.map((d) => (
              <Card key={d.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{d.label}</h3>
                  <div className="flex items-center gap-2"><KindBadge kind={d.kind} /><span className={cn('text-lg font-bold tabular-nums', scoreColor(d.score))}>{d.score}<span className="text-xs font-normal text-slate-400">/100</span></span></div>
                </div>
                <ProgressBar value={d.score} />
                <p className="text-sm text-slate-600 dark:text-slate-400">{d.explanation}</p>
                <ul className="space-y-1 text-sm">
                  {d.suggestions.map((s) => <li key={s} className="flex gap-2"><span className="text-brand-500">→</span><span>{s}</span></li>)}
                </ul>
              </Card>
            ))}
          </div>

          {otherIssues.length > 0 && (
            <Card>
              <CardHeader title="Other things to work on" />
              <ul className="space-y-2">
                {otherIssues.map((i, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Badge tone={i.category === 'relevance' || i.category === 'length' ? 'rose' : 'amber'} className="mt-0.5 shrink-0">{ISSUE_LABELS[i.category]}</Badge>
                    <span>{i.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium">{e.modelAnswerKind === 'framework' ? 'Answer framework' : e.modelAnswerKind === 'ai' ? 'Better answer' : 'Model answer'}</p>
              <Badge tone={e.modelAnswerKind === 'framework' ? 'neutral' : 'brand'}>{e.modelAnswerKind === 'framework' ? 'Structure guide' : e.modelAnswerKind === 'ai' ? 'Written by AI from your ideas' : 'Written sample'}</Badge>
            </div>
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{e.modelAnswer}</p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="All tips" />
              <ul className="space-y-1.5 text-sm">{e.tips.map((t) => <li key={t}>• {t}</li>)}</ul>
            </Card>
            <Card>
              <CardHeader icon={<CircleCheck className="h-4 w-4" />} title="Strengths" />
              {e.strengths.length ? (
                <ul className="space-y-2 text-sm">{e.strengths.map((s) => <li key={s} className="flex gap-2"><span className="text-brand-500">✓</span>{s}</li>)}</ul>
              ) : <p className="text-sm text-slate-500">Strengths will appear here as your scores improve.</p>}
            </Card>
          </div>
          {editedTranscript && (
            <Card>
              <CardHeader title="Original transcript (before your edits)" />
              <p className="text-sm text-slate-600 dark:text-slate-400">{originalTranscript}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
