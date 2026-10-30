import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Flag, MessagesSquare, RotateCcw } from 'lucide-react';
import type { Attempt, Difficulty, Question, QuestionType } from '../types';
import { nodeToQuestion, pickQuestions, pickScenario, SCENARIOS, TYPE_LABELS } from '../data/questionBank';
import { InteractiveConversation } from '../engines/interactive';
import { average, toDetScore } from '../engines/scoring';
import { useSettings } from '../hooks/useSettings';
import { useAttempts } from '../hooks/useData';
import { newId } from '../storage/db';
import { createAttempt } from '../services/attempts';
import { activeAi } from '../services/ai';
import { SpeakingTask, type TaskOutcome } from '../components/SpeakingTask';
import { AnswerReview, type ReviewedAnswer } from '../components/AnswerReview';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { Alert, Badge, Button, Card, CardHeader, DetScore, ScoreRing, Spinner } from '../components/ui';
import { cn } from '../utils/format';

type PracticeType = QuestionType | 'random';
const VALID: PracticeType[] = ['photo', 'read-then-speak', 'interactive', 'speaking-sample', 'random'];
const RANDOM_TYPES: QuestionType[] = ['photo', 'read-then-speak', 'interactive', 'speaking-sample'];
const RECENT_LIMIT = 40;

type Stage =
  | { kind: 'task'; take: number }
  | { kind: 'review'; outcome: TaskOutcome; take: number }
  | { kind: 'saving' }
  | { kind: 'feedback'; attempt: Attempt }
  | { kind: 'conversation-end' }
  | { kind: 'summary' };

interface Current {
  question: Question;
  conversation?: InteractiveConversation;
}

export function PracticeSessionPage() {
  const { type = '' } = useParams();
  const [params] = useSearchParams();
  const difficulty = (params.get('difficulty') ?? 'intermediate') as Difficulty | 'any';
  const { settings, loaded } = useSettings();
  const { data: allAttempts, loading } = useAttempts();

  const sessionId = useMemo(() => newId('ps'), []);
  const [current, setCurrent] = useState<Current | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'task', take: 0 });
  const [sessionAttempts, setSessionAttempts] = useState<Attempt[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const usedRef = useRef<Set<string>>(new Set());

  const recentIds = useMemo(() => {
    const ids = allAttempts.slice(0, RECENT_LIMIT).map((a) => a.scenarioId ?? a.question.id);
    return new Set(ids);
  }, [allAttempts]);

  const startConversation = useCallback((): Current => {
    const scenario = pickScenario({ difficulty, exclude: [...recentIds, ...usedRef.current] });
    usedRef.current.add(scenario.id);
    const conversation = new InteractiveConversation(scenario);
    return { question: nodeToQuestion(scenario, conversation.currentNode!), conversation };
  }, [difficulty, recentIds]);

  const pickNext = useCallback((): Current => {
    const t: QuestionType = type === 'random' ? RANDOM_TYPES[Math.floor(Math.random() * RANDOM_TYPES.length)] : (type as QuestionType);
    if (t === 'interactive') {
      if (type === 'random') {
        // Random mode uses the opening question of a conversation as a standalone prompt.
        const s = pickScenario({ difficulty, exclude: [...recentIds, ...usedRef.current] });
        usedRef.current.add(s.id);
        return { question: nodeToQuestion(s, s.nodes.find((n) => n.id === s.start) ?? s.nodes[0]) };
      }
      return startConversation();
    }
    const [q] = pickQuestions(1, { type: t, difficulty, exclude: [...recentIds, ...usedRef.current] });
    usedRef.current.add(q.id);
    return { question: q };
  }, [type, difficulty, recentIds, startConversation]);

  // Pick the first question once history has loaded (so recent questions can be avoided).
  useEffect(() => {
    if (!current && !loading && loaded && VALID.includes(type as PracticeType)) setCurrent(pickNext());
  }, [current, loading, loaded, pickNext, type]);

  if (!VALID.includes(type as PracticeType)) return <Navigate to="/practice" replace />;
  if (!current || !loaded) return <Spinner label="Preparing your question…" />;

  const q = current.question;
  const conv = current.conversation;
  const prep = Math.round(q.prepSeconds * settings.practicePrepMultiplier);

  const handleSubmit = async (r: ReviewedAnswer) => {
    setStage({ kind: 'saving' });
    setSaveError(null);
    try {
      const attempt = await createAttempt({
        question: q,
        originalTranscript: r.originalTranscript,
        editedTranscript: r.editedTranscript,
        source: r.source,
        durationSeconds: r.durationSeconds,
        blob: r.blob,
        mode: 'practice',
        sessionId,
        scenarioId: conv?.scenario.id,
        storeRecording: settings.saveRecordings,
      });
      setSessionAttempts((s) => [...s, attempt]);
      setStage({ kind: 'feedback', attempt });
    } catch (e) {
      setSaveError(`Could not save your answer: ${(e as Error).message}`);
      setStage({ kind: 'summary' });
    }
  };

  const next = () => {
    if (conv && stage.kind === 'feedback') {
      const a = stage.attempt;
      const nextNode = conv.answer(a.editedTranscript ?? a.originalTranscript);
      if (!nextNode) {
        setStage({ kind: 'conversation-end' });
        return;
      }
      setCurrent({ question: nodeToQuestion(conv.scenario, nextNode), conversation: conv });
    } else {
      setCurrent(pickNext());
    }
    setStage({ kind: 'task', take: 0 });
  };

  const newConversation = () => {
    setCurrent(startConversation());
    setStage({ kind: 'task', take: 0 });
  };

  const convAttempts = conv ? sessionAttempts.filter((a) => a.scenarioId === conv.scenario.id && a.sessionId === sessionId) : [];
  const title = type === 'random' ? 'Random Practice' : TYPE_LABELS[type as QuestionType];

  return (
    <div className="space-y-5">
      {/* Session bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/practice" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back to practice"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Practice Mode · <span className="capitalize">{difficulty === 'any' ? 'all levels' : difficulty}</span> · {sessionAttempts.length} answered
              {sessionAttempts.length > 0 && <> · avg <DetScore score={average(sessionAttempts.map((a) => a.evaluation.practiceScore))} />/160</>}
            </p>
          </div>
        </div>
        {stage.kind !== 'summary' && sessionAttempts.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setStage({ kind: 'summary' })}><Flag className="h-4 w-4" /> End session</Button>
        )}
      </div>

      {conv && stage.kind !== 'summary' && stage.kind !== 'conversation-end' && (
        <Card className="flex flex-wrap items-center gap-3 py-3">
          <MessagesSquare className="h-5 w-5 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{conv.scenario.title}: question {Math.min(conv.index + 1, conv.length)} of {conv.length}</p>
            <p className="truncate text-xs text-slate-500">{conv.scenario.intro}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: conv.length }, (_, i) => (
              <span key={i} className={cn('h-1.5 w-6 rounded-full', i < conv.index ? 'bg-brand-500' : i === conv.index ? 'bg-brand-300' : 'bg-slate-200 dark:bg-slate-700')} />
            ))}
          </div>
        </Card>
      )}

      {stage.kind === 'task' && (
        <SpeakingTask
          key={`${q.id}-${stage.take}`}
          question={q}
          mode="practice"
          prepSeconds={prep}
          autoStart={settings.autoStartRecording}
          beeps={settings.timerBeeps}
          readAloud={settings.readQuestionsAloud}
          skipPrep={stage.take > 0}
          settings={settings}
          onFinished={(outcome) => setStage({ kind: 'review', outcome, take: stage.take })}
        />
      )}

      {stage.kind === 'review' && (
        <AnswerReview
          question={q}
          outcome={stage.outcome}
          autoPlay={settings.autoPlayback}
          onReRecord={() => setStage({ kind: 'task', take: stage.take + 1 })}
          onSubmit={handleSubmit}
        />
      )}

      {stage.kind === 'saving' && <Card><Spinner label={activeAi(settings) ? 'AI coach is checking your answer…' : 'Evaluating your answer…'} /></Card>}

      {stage.kind === 'feedback' && (
        <>
          <FeedbackPanel evaluation={stage.attempt.evaluation} originalTranscript={stage.attempt.originalTranscript} editedTranscript={stage.attempt.editedTranscript} />
          <div className="sticky bottom-20 z-20 flex justify-end gap-2 lg:bottom-4">
            <Button variant="secondary" onClick={() => setStage({ kind: 'task', take: 1 })} className="shadow-lg">
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
            <Button size="lg" onClick={next} className="shadow-lg">
              {conv && conv.index + 1 >= conv.length ? 'Finish conversation' : 'Next question'} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {stage.kind === 'conversation-end' && conv && (
        <Card>
          <CardHeader title={`Conversation complete: ${conv.scenario.title}`} subtitle={`${convAttempts.length} answers · average score ${toDetScore(average(convAttempts.map((a) => a.evaluation.practiceScore)))}/160`} />
          <ol className="space-y-3">
            {convAttempts.map((a, i) => (
              <li key={a.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{i + 1}. {a.question.text}</p>
                  <DetScore score={a.evaluation.practiceScore} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{a.editedTranscript ?? a.originalTranscript}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setStage({ kind: 'summary' })}>End session</Button>
            {SCENARIOS.length > 1 && <Button onClick={newConversation}>Start another conversation <ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </Card>
      )}

      {stage.kind === 'summary' && (
        <Card>
          {saveError && <Alert tone="error" className="mb-4">{saveError}</Alert>}
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ScoreRing score={average(sessionAttempts.map((a) => a.evaluation.practiceScore))} label="Session average" />
            <div>
              <h2 className="text-lg font-semibold">Session summary</h2>
              <p className="text-sm text-slate-500">{sessionAttempts.length} answer{sessionAttempts.length === 1 ? '' : 's'} saved to your history.</p>
            </div>
          </div>
          <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
            {sessionAttempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Badge tone="brand">{TYPE_LABELS[a.question.type]}</Badge>
                  <p className="mt-1 truncate text-sm">{a.question.text}</p>
                </div>
                <Link to={`/history/${a.id}`} className="hover:underline"><DetScore score={a.evaluation.practiceScore} /></Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Link to="/history"><Button variant="outline">View history</Button></Link>
            <Button onClick={() => { setCurrent(pickNext()); setStage({ kind: 'task', take: 0 }); }}>Keep practising <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}
    </div>
  );
}
