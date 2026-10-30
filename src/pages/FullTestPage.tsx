import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Clock, LogOut, Mic, ShieldCheck } from 'lucide-react';
import type { Attempt, Difficulty, Question } from '../types';
import { nodeToQuestion, TYPE_LABELS } from '../data/questionBank';
import { buildTestPlan, countAnswers, estimateMinutes, TEST_CONFIG, type TestStep } from '../engines/testPlan';
import { InteractiveConversation } from '../engines/interactive';
import { useSettings } from '../hooks/useSettings';
import { useAttempts } from '../hooks/useData';
import { newId } from '../storage/db';
import { createAttempt, saveTestResult } from '../services/attempts';
import { resolveEngine } from '../services/transcription';
import { SpeakingTask, type TaskOutcome } from '../components/SpeakingTask';
import { MicCheck, WhisperPreloader } from '../components/MicCheck';
import { Alert, Badge, Button, Card, CardHeader, ConfirmDialog, PageHeader, ProgressBar, Segmented, Spinner } from '../components/ui';

type Phase = 'intro' | 'check' | 'running' | 'between' | 'processing';

interface CollectedAnswer {
  question: Question;
  outcome: TaskOutcome;
  startedAt: number;
  scenarioId?: string;
}

const BRANCH_TIMEOUT_MS = 10000;

export function FullTestPage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { data: attempts } = useAttempts();
  const engine = resolveEngine(settings);

  const [phase, setPhase] = useState<Phase>('intro');
  const [difficulty, setDifficulty] = useState<Difficulty | 'any'>(settings.defaultDifficulty);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [slot, setSlot] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const testIdRef = useRef(newId('test'));
  const startedAtRef = useRef(0);
  const answersRef = useRef<CollectedAnswer[]>([]);
  const convRef = useRef<InteractiveConversation | null>(null);
  const questionStartRef = useRef(0);

  const totalAnswers = countAnswers(steps);

  // Warn before closing the tab mid-test.
  useEffect(() => {
    if (phase !== 'running' && phase !== 'between' && phase !== 'processing') return;
    const fn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [phase]);

  const finishTest = useCallback(async () => {
    setPhase('processing');
    const answers = answersRef.current;
    setProgress({ done: 0, total: answers.length });
    const testId = testIdRef.current;
    const saved: Attempt[] = [];
    try {
      for (let i = 0; i < answers.length; i++) {
        const a = answers[i];
        const t = await a.outcome.session.finish(a.outcome.recording.blob);
        saved.push(await createAttempt({
          question: a.question,
          originalTranscript: t.text,
          editedTranscript: null,
          source: t.source,
          durationSeconds: a.outcome.recording.durationSeconds,
          blob: a.outcome.recording.blob,
          mode: 'test',
          sessionId: testId,
          testId,
          scenarioId: a.scenarioId,
          storeRecording: settings.saveRecordings,
          createdAt: a.startedAt,
        }));
        setProgress({ done: i + 1, total: answers.length });
      }
      await saveTestResult({
        id: testId, startedAt: startedAtRef.current, finishedAt: Date.now(), configName: TEST_CONFIG.name,
        attemptIds: saved.map((s) => s.id), completed: true,
      }, saved);
      navigate(`/test/results/${testId}`, { replace: true });
    } catch (e) {
      setError(`Saving the test failed: ${(e as Error).message}`);
    }
  }, [navigate, settings.saveRecordings]);

  const goToStep = useCallback((i: number, plan: TestStep[]) => {
    if (i >= plan.length) {
      void finishTest();
      return;
    }
    const s = plan[i];
    setStepIdx(i);
    if (s.kind === 'question') {
      convRef.current = null;
      setCurrent(s.question);
    } else {
      const conv = new InteractiveConversation(s.scenario, s.count);
      convRef.current = conv;
      setCurrent(nodeToQuestion(s.scenario, conv.currentNode!, s.section.answerSeconds ?? s.scenario.answerSeconds));
    }
    questionStartRef.current = Date.now();
    setSlot((n) => n + 1);
    setPhase('running');
  }, [finishTest]);

  const begin = () => {
    const recent = attempts.slice(0, 40).map((a) => a.scenarioId ?? a.question.id);
    const plan = buildTestPlan(TEST_CONFIG, difficulty, recent);
    setSteps(plan);
    answersRef.current = [];
    setAnswered(0);
    testIdRef.current = newId('test');
    startedAtRef.current = Date.now();
    goToStep(0, plan);
  };

  const onFinished = async (outcome: TaskOutcome) => {
    if (!current) return;
    const step = steps[stepIdx];
    answersRef.current.push({
      question: current, outcome, startedAt: questionStartRef.current,
      scenarioId: step.kind === 'interactive' ? step.scenario.id : undefined,
    });
    setAnswered((n) => n + 1);

    const conv = convRef.current;
    if (step.kind === 'interactive' && conv) {
      setPhase('between');
      // The next question depends on this answer, so wait (briefly) for its transcript.
      const text = await Promise.race([
        outcome.session.finish(outcome.recording.blob).then((r) => r.text),
        new Promise<string>((r) => setTimeout(() => r(''), BRANCH_TIMEOUT_MS)),
      ]);
      const node = conv.answer(text);
      if (node) {
        setCurrent(nodeToQuestion(step.scenario, node, step.section.answerSeconds ?? step.scenario.answerSeconds));
        questionStartRef.current = Date.now();
        setSlot((n) => n + 1);
        setPhase('running');
        return;
      }
    }
    goToStep(stepIdx + 1, steps);
  };

  // ---------------- Running (full-screen) ----------------
  if (phase === 'running' || phase === 'between') {
    const step = steps[stepIdx];
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-brand-600" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">Question {Math.min(answered + 1, totalAnswers)} of {totalAnswers} · {step ? TYPE_LABELS[step.section.type] : ''}</span>
                <span className="ml-3 shrink-0 text-slate-500">{Math.round((answered / Math.max(1, totalAnswers)) * 100)}%</span>
              </div>
              <ProgressBar value={(answered / Math.max(1, totalAnswers)) * 100} colorByScore={false} className="mt-1.5" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExitOpen(true)}><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Exit</span></Button>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {step?.kind === 'interactive' && (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{step.scenario.intro}</p>
          )}
          {phase === 'between' || !current ? (
            <Card className="flex justify-center py-16"><Spinner label="Loading next question…" /></Card>
          ) : (
            <SpeakingTask
              key={slot}
              question={current}
              mode="test"
              prepSeconds={current.prepSeconds}
              autoStart
              beeps={settings.timerBeeps}
              readAloud={settings.readQuestionsAloud}
              settings={settings}
              onFinished={(o) => void onFinished(o)}
            />
          )}
        </div>
        <ConfirmDialog
          open={exitOpen}
          title="Exit the test?"
          description="Your answers from this test will be discarded and no results will be saved."
          confirmLabel="Exit test"
          danger
          onCancel={() => setExitOpen(false)}
          onConfirm={() => { setExitOpen(false); navigate('/'); }}
        />
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <Card className="mx-auto max-w-lg space-y-4 text-center">
        <h2 className="text-lg font-semibold">Test complete. Analysing your answers…</h2>
        <p className="text-sm text-slate-500">
          {engine === 'whisper' ? 'Transcribing each recording locally with Whisper. This can take a minute.' : 'Evaluating your answers.'}
        </p>
        <ProgressBar value={progress.total ? (progress.done / progress.total) * 100 : 0} colorByScore={false} />
        <p className="text-sm tabular-nums text-slate-500">{progress.done} / {progress.total}</p>
        {error && <Alert tone="error">{error}</Alert>}
      </Card>
    );
  }

  // ---------------- Intro & checks ----------------
  const minutes = estimateMinutes(TEST_CONFIG);
  return (
    <>
      <PageHeader title="Full Test Mode" subtitle="A complete speaking test simulation. Results are shown only at the end." />
      {phase === 'intro' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader icon={<ClipboardCheck className="h-4 w-4" />} title={TEST_CONFIG.name} subtitle={TEST_CONFIG.description} />
            <ol className="space-y-2">
              {TEST_CONFIG.sections.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
                  <span className="font-medium">{i + 1}. {TYPE_LABELS[s.type]}</span>
                  <span className="text-slate-500">
                    {s.type === 'interactive'
                      ? `${s.count} questions · ${s.answerSeconds ?? 35}s each`
                      : `${s.count} × (${s.prepSeconds ?? 20}s prep, ${s.minSeconds ?? 30}–${s.maxSeconds ?? 90}s)`}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <Badge><Clock className="h-3 w-3" /> ≈ {minutes} min</Badge>
              <Badge><Mic className="h-3 w-3" /> {countAnswers(buildTestPlan(TEST_CONFIG, 'any', []))} answers</Badge>
            </div>
          </Card>
          <Card className="space-y-4">
            <h3 className="font-semibold">Test rules</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" /> No scores, corrections or hints during the test.</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" /> Recording starts automatically after preparation time.</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" /> When time runs out, the test moves to the next question.</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" /> You can press “Next” after the minimum speaking time.</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" /> Find a quiet place and use headphones if possible.</li>
            </ul>
            <div>
              <p className="mb-2 text-sm font-medium">Difficulty</p>
              <Segmented value={difficulty} onChange={setDifficulty} options={[
                { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }, { value: 'any', label: 'Mixed' },
              ]} />
            </div>
            <Button size="lg" className="w-full" onClick={() => setPhase('check')}>Continue to mic check <ArrowRight className="h-4 w-4" /></Button>
          </Card>
        </div>
      )}

      {phase === 'check' && (
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="space-y-3">
            <CardHeader icon={<Mic className="h-4 w-4" />} title="1. Microphone check" subtitle="Record a short sample to make sure your voice is picked up." />
            <MicCheck onResult={setMicOk} />
          </Card>
          <Card className="space-y-3">
            <CardHeader icon={<ClipboardCheck className="h-4 w-4" />} title="2. Transcription" subtitle={engine === 'whisper' ? 'Your answers will be transcribed locally after the test.' : engine === 'web-speech' ? 'Browser speech recognition will run during each answer (requires internet).' : 'You will type your transcripts on the results page.'} />
            {engine === 'whisper' && <WhisperPreloader model={settings.whisperModel} />}
            {engine === 'manual' && <Alert tone="info">Manual mode: after the test, open each answer on the results page, listen, and type what you said to get feedback.</Alert>}
            {engine === 'web-speech' && <Alert tone="info">Interactive Speaking follow-up questions are chosen from your previous answer, so transcription must work during the test.</Alert>}
          </Card>
          {micOk === false && (
            <Alert tone="warning" title="Microphone not confirmed">You can still start, but your answers may be silent.</Alert>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setPhase('intro')}>Back</Button>
            <Button size="lg" onClick={begin} disabled={micOk === null}>Start test <ArrowRight className="h-4 w-4" /></Button>
          </div>
          {micOk === null && <p className="text-right text-xs text-slate-400">Complete the microphone check to start.</p>}
        </div>
      )}
    </>
  );
}
