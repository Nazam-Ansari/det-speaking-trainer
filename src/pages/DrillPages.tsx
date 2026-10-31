import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, CircleCheck, Mic, RotateCcw, Square, Volume2, Wand2 } from 'lucide-react';
import { useAttempts } from '../hooks/useData';
import { useSettings } from '../hooks/useSettings';
import { useRecorder } from '../hooks/useRecorder';
import { TranscriptionSession, resolveEngine } from '../services/transcription';
import { applyGrammarRules } from '../engines/evaluation';
import { GRAMMAR_RULES } from '../engines/evaluation/grammarRules';
import { splitSentences, words } from '../engines/evaluation/text';
import { GRAMMAR_DRILLS, drillForRule, type GrammarDrill } from '../data/grammarDrills';
import { CorrectionDiff } from '../components/FeedbackPanel';
import { speak } from '../components/QuestionPrompt';
import { LevelMeter } from '../components/SpeakingTask';
import { Alert, Badge, Button, Card, PageHeader, ProgressBar, Segmented } from '../components/ui';
import { cn, formatSeconds } from '../utils/format';
import type { Attempt } from '../types';

const ROUND = 5;
const ANSWER_SECONDS = 30;

/** How often each drill's grammar point went wrong in your answers. */
function mistakeCounts(attempts: Attempt[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of attempts.slice(0, 40)) {
    for (const c of a.evaluation.corrections) {
      for (const r of c.reasons) {
        const rule = GRAMMAR_RULES.find((g) => r.startsWith(g.message));
        const drill = rule && drillForRule(rule.id);
        if (drill) counts.set(drill.id, (counts.get(drill.id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function DrillHubPage() {
  const { data: attempts } = useAttempts();
  const counts = useMemo(() => mistakeCounts(attempts), [attempts]);
  const drills = [...GRAMMAR_DRILLS].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

  return (
    <>
      <PageHeader title="Grammar Drill" subtitle="Short spoken questions that make you use the grammar you get wrong. Answer, see the correction, then say it again correctly." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {drills.map((d, i) => {
          const n = counts.get(d.id) ?? 0;
          return (
            <Link key={d.id} to={`/drill/${d.id}`} className="group focus-visible:outline-none">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md dark:group-hover:border-brand-800">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{d.title}</h3>
                  {n > 0 && i < 2 && <Badge tone="amber">Recommended</Badge>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{d.example.wrong} → <span className="text-brand-700 dark:text-brand-300">{d.example.right}</span></p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className={n ? 'text-rose-600' : 'text-slate-400'}>{n ? `You made this mistake ${n}×` : 'No mistakes found yet'}</span>
                  <span className="flex items-center gap-1 font-medium text-brand-600">Start <ArrowRight className="h-4 w-4" /></span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

// ---------- Session ----------

interface Check { said: string; corrected: string; reasons: string[] }

function checkGrammar(text: string): Check {
  const sentences = splitSentences(text);
  const reasons = new Set<string>();
  const corrected = sentences.map((s) => {
    const r = applyGrammarRules(s);
    r.hits.forEach((h) => reasons.add(`${h.rule.message} ("${h.excerpt}" → "${h.replacement}")`));
    return r.corrected;
  });
  return { said: text.trim(), corrected: corrected.join(' '), reasons: [...reasons] };
}

/** Share of the target's words that also appear in what was said (order ignored). */
function overlap(target: string, said: string): number {
  const t = words(target);
  const pool = words(said);
  let hit = 0;
  for (const w of t) {
    const i = pool.indexOf(w);
    if (i >= 0) { hit++; pool.splice(i, 1); }
  }
  return t.length ? hit / t.length : 0;
}

function shuffle<T>(a: T[]): T[] {
  return [...a].sort(() => Math.random() - 0.5);
}

type Step =
  | { kind: 'answer' }
  | { kind: 'result'; check: Check }
  | { kind: 'repeat'; check: Check }
  | { kind: 'repeat-result'; check: Check; ok: boolean; again: Check };

type Outcome = 'clean' | 'fixed' | 'missed';

/** Records one spoken answer and returns its transcript (or lets you type it). */
function SpeakBox({ onText, prompt }: { onText: (text: string) => void; prompt: string }) {
  const { settings } = useSettings();
  const manual = resolveEngine(settings) === 'manual';
  const session = useRef<TranscriptionSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(manual ? '' : null);
  const [note, setNote] = useState<string | null>(null);

  const finish = useCallback(async (blob: Blob | null) => {
    setBusy(true);
    const out = await session.current!.finish(blob);
    setBusy(false);
    setDraft(out.text);
    setNote(out.error ?? (out.text ? null : 'Nothing was heard. Type what you said, or record again.'));
  }, []);
  const recorder = useRecorder({ maxSeconds: ANSWER_SECONDS, onAutoStop: (r) => void finish(r.blob) });
  const recording = recorder.status === 'recording';

  const start = async () => {
    window.speechSynthesis?.cancel();
    setDraft(null);
    setNote(null);
    session.current?.abort();
    session.current = new TranscriptionSession(settings);
    if (await recorder.start()) session.current.begin();
  };
  const stop = async () => {
    const r = await recorder.stop();
    if (r) void finish(r.blob);
  };

  if (busy) return <p className="py-6 text-center text-sm text-slate-500">Listening to your answer…</p>;

  if (draft != null) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">{manual ? 'Type what you would say:' : 'This is what we heard. Fix any word that was heard wrongly (not your grammar!), then check.'}</p>
        {note && <Alert tone="warning">{note}</Alert>}
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-[15px] focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onText(draft)} disabled={words(draft).length < 3}><Wand2 className="h-4 w-4" /> Check</Button>
          {!manual && <Button variant="outline" onClick={() => void start()}><RotateCcw className="h-4 w-4" /> Record again</Button>}
        </div>
        {words(draft).length < 3 && draft.trim() && <p className="text-xs text-slate-500">Say a full sentence (at least 3 words).</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {recording ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Recording · {formatSeconds(recorder.elapsed)} / {formatSeconds(ANSWER_SECONDS)}</p>
          <LevelMeter level={recorder.level} active />
          <Button variant="danger" onClick={() => void stop()}><Square className="h-4 w-4" /> Done</Button>
        </>
      ) : (
        <Button size="lg" onClick={() => void start()} loading={recorder.status === 'requesting'}><Mic className="h-5 w-5" /> {prompt}</Button>
      )}
      {recorder.error && <Alert tone="error" title="Microphone problem">{recorder.error}</Alert>}
    </div>
  );
}

export function DrillSessionPage() {
  const { id } = useParams();
  const drill = GRAMMAR_DRILLS.find((d) => d.id === id);
  if (!drill) return <Navigate to="/drill" replace />;
  return <DrillSession key={drill.id} drill={drill} />;
}

function DrillSession({ drill }: { drill: GrammarDrill }) {
  const [round, setRound] = useState(() => shuffle(drill.questions).slice(0, ROUND));
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>({ kind: 'answer' });
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [lang, setLang] = useState<'english' | 'roman-urdu'>('english');
  const question = round[index];
  const done = index >= round.length;

  const ask = useCallback((q: string) => speak(q), []);
  // Read each new question aloud once.
  useEffect(() => {
    if (!question) return;
    ask(question);
    return () => window.speechSynthesis?.cancel();
  }, [question, ask]);

  const record = (o: Outcome) => setOutcomes((list) => [...list, o]);
  const next = () => { setIndex((i) => i + 1); setStep({ kind: 'answer' }); };
  const restart = () => { setRound(shuffle(drill.questions).slice(0, ROUND)); setIndex(0); setOutcomes([]); setStep({ kind: 'answer' }); };

  const onAnswer = (text: string) => {
    const check = checkGrammar(text);
    if (!check.reasons.length) record('clean');
    setStep({ kind: 'result', check });
  };
  const onRepeat = (text: string) => {
    if (step.kind !== 'repeat') return;
    const again = checkGrammar(text);
    const ok = again.reasons.length === 0 && overlap(step.check.corrected, text) >= 0.75;
    setStep({ kind: 'repeat-result', check: step.check, ok, again });
  };

  if (done) {
    const clean = outcomes.filter((o) => o === 'clean').length;
    const fixed = outcomes.filter((o) => o === 'fixed').length;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title={`${drill.title} — round complete`} />
        <Card className="space-y-4 text-center">
          <CircleCheck className="mx-auto h-10 w-10 text-brand-600" />
          <p className="text-lg font-semibold">{clean} correct first time · {fixed} fixed by repeating · {round.length - clean - fixed} still to practise</p>
          <p className="text-sm text-slate-500">Saying the correct sentence out loud is what builds the habit. Do another round tomorrow — the mistake fades with repetition.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={restart}><RotateCcw className="h-4 w-4" /> Another round</Button>
            <Link to="/drill"><Button variant="outline">All drills</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={drill.title} subtitle={`Question ${index + 1} of ${round.length}`} action={<Link to="/drill"><Button variant="ghost" size="sm">All drills</Button></Link>} />
      <ProgressBar value={(index / round.length) * 100} colorByScore={false} />

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-500">The rule</p>
          <Segmented value={lang} onChange={setLang} options={[{ value: 'english', label: 'English' }, { value: 'roman-urdu', label: 'Urdu' }]} />
        </div>
        <p className="text-sm">{lang === 'english' ? drill.rule : drill.urdu}</p>
        <p className="mt-2 text-sm"><span className="text-rose-600 line-through">{drill.example.wrong}</span> → <span className="font-medium text-brand-700 dark:text-brand-300">{drill.example.right}</span></p>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <p className="flex-1 text-xl font-semibold">{question}</p>
          <button onClick={() => ask(question)} aria-label="Hear the question" className="text-slate-400 hover:text-brand-600"><Volume2 className="h-5 w-5" /></button>
        </div>

        {step.kind === 'answer' && (
          <>
            <p className="text-sm text-slate-500">Answer in 1–3 full sentences.</p>
            <SpeakBox key={`a${index}`} onText={onAnswer} prompt="Answer" />
          </>
        )}

        {step.kind === 'result' && (step.check.reasons.length === 0 ? (
          <div className="space-y-3">
            <Alert tone="success" title="No mistakes found!">“{step.check.said}”</Alert>
            <Button onClick={next}>Next question <ArrowRight className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-medium text-amber-700 dark:text-amber-300">Almost! Here is the correction:</p>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><CorrectionDiff original={step.check.said} corrected={step.check.corrected} /></div>
            <ul className="text-sm text-slate-600 dark:text-slate-400">{step.check.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { speak(step.check.corrected); setStep({ kind: 'repeat', check: step.check }); }}>Now say it correctly <ArrowRight className="h-4 w-4" /></Button>
              <Button variant="ghost" onClick={() => { record('missed'); next(); }}>Skip</Button>
            </div>
          </div>
        ))}

        {step.kind === 'repeat' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Say this sentence out loud:</p>
            <p className="rounded-xl bg-brand-50 p-3 text-[15px] font-medium dark:bg-brand-950/40">{step.check.corrected}
              <button onClick={() => speak(step.check.corrected)} aria-label="Hear the correct sentence" className="ml-2 inline-flex align-middle text-slate-400 hover:text-brand-600"><Volume2 className="h-4 w-4" /></button>
            </p>
            <SpeakBox key={`r${index}`} onText={onRepeat} prompt="Say it" />
          </div>
        )}

        {step.kind === 'repeat-result' && (
          <div className="space-y-3">
            {step.ok ? (
              <Alert tone="success" title="Perfect — you fixed it!">“{step.again.said}”</Alert>
            ) : (
              <>
                <Alert tone="warning" title="Not quite yet">
                  {step.again.reasons.length ? 'There is still a mistake:' : 'Try to say the corrected sentence more closely.'}
                </Alert>
                {step.again.reasons.length > 0 && <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><CorrectionDiff original={step.again.said} corrected={step.again.corrected} /></div>}
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {step.ok
                ? <Button onClick={() => { record('fixed'); next(); }}>Next question <ArrowRight className="h-4 w-4" /></Button>
                : <>
                    <Button onClick={() => setStep({ kind: 'repeat', check: step.check })}><RotateCcw className="h-4 w-4" /> Try again</Button>
                    <Button variant="ghost" onClick={() => { record('missed'); next(); }}>Next question</Button>
                  </>}
            </div>
          </div>
        )}
      </Card>

      <p className={cn('text-center text-xs text-slate-400')}>The checker catches common patterns only, so it can miss some mistakes.</p>
    </div>
  );
}
