import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Image, MessagesSquare, Mic, Shuffle } from 'lucide-react';
import type { Difficulty, QuestionType } from '../types';
import { QUESTIONS, SCENARIOS, TOTAL_PROMPTS } from '../data/questionBank';
import { useSettings } from '../hooks/useSettings';
import { Alert, Badge, Card, PageHeader, Segmented } from '../components/ui';
import { recorderSupport } from '../services/audio';
import { engineInfo, resolveEngine } from '../services/transcription';
import { formatSeconds } from '../utils/format';

const EXERCISES: { type: QuestionType | 'random'; title: string; description: string; icon: typeof Image; timing: string }[] = [
  { type: 'photo', title: 'Speak About the Photo', description: 'Describe a picture in detail: people, actions, setting, and what might be happening.', icon: Image, timing: `20s prep · ${formatSeconds(30)}–${formatSeconds(90)} speaking` },
  { type: 'read-then-speak', title: 'Read, Then Speak', description: 'Read a prompt with guiding points, prepare, then give a structured answer.', icon: FileText, timing: `20s prep · ${formatSeconds(30)}–${formatSeconds(90)} speaking` },
  { type: 'interactive', title: 'Interactive Speaking', description: 'A 6–8 question conversation. Follow-up questions depend on what you say.', icon: MessagesSquare, timing: '≈35s per answer' },
  { type: 'speaking-sample', title: 'Speaking Sample', description: 'An open-ended topic and an extended answer. Great for fluency and development.', icon: Mic, timing: `30s prep · ${formatSeconds(60)}–${formatSeconds(180)} speaking` },
  { type: 'random', title: 'Random Practice', description: 'Continuous mixed practice across all task types, avoiding recently answered questions.', icon: Shuffle, timing: 'Mixed timings' },
];

function countFor(type: QuestionType | 'random', difficulty: Difficulty | 'any'): number {
  const fits = (d: Difficulty) => difficulty === 'any' || d === difficulty;
  if (type === 'interactive') return SCENARIOS.filter((s) => fits(s.difficulty)).length;
  if (type === 'random') return QUESTIONS.filter((q) => fits(q.difficulty)).length + SCENARIOS.filter((s) => fits(s.difficulty)).length;
  return QUESTIONS.filter((q) => q.type === type && fits(q.difficulty)).length;
}

export function PracticeHubPage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty | 'any'>(settings.defaultDifficulty);
  const mic = recorderSupport();
  const engine = engineInfo(settings).find((e) => e.id === resolveEngine(settings))!;

  return (
    <>
      <PageHeader
        title="Practice Mode"
        subtitle="One question at a time, with detailed feedback and corrections after every answer."
        action={
          <Segmented
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
              { value: 'any', label: 'All' },
            ]}
          />
        }
      />

      {!mic.supported && <Alert tone="error" title="Recording unavailable" className="mb-5">{mic.reason}</Alert>}
      <Alert tone="info" className="mb-6" title={`Transcription: ${engine.label}`}>
        {engine.description}{' '}
        {engine.id !== settings.transcriptionEngine && 'Your preferred engine is not supported in this browser, so a fallback is used. '}
        Change this in Settings.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXERCISES.map(({ type, title, description, icon: Icon, timing }) => (
          <button
            key={type}
            onClick={() => navigate(`/practice/${type}?difficulty=${difficulty}`)}
            className="group text-left focus-visible:outline-none"
          >
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-brand-500 dark:group-hover:border-brand-800">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950 dark:text-brand-400"><Icon className="h-5 w-5" /></div>
                <Badge>{countFor(type, difficulty)} {type === 'interactive' ? 'conversations' : 'prompts'}</Badge>
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-400">{timing}</span>
                <span className="flex items-center gap-1 font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">Start <ArrowRight className="h-4 w-4" /></span>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Question bank: {TOTAL_PROMPTS} original prompts ({QUESTIONS.length} standalone + {SCENARIOS.length} branching conversations). Add more in <code className="text-xs">src/data/questions/*.json</code>.
      </p>
    </>
  );
}
