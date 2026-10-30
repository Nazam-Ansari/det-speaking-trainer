import { useEffect, useState } from 'react';
import { MessagesSquare, Volume2 } from 'lucide-react';
import type { Question } from '../types';
import { imageUrl, TOPIC_LABELS, TYPE_LABELS } from '../data/questionBank';
import { Badge } from './ui';

const INSTRUCTIONS: Record<Question['type'], string> = {
  photo: 'Describe the image in as much detail as you can.',
  'read-then-speak': 'Read the prompt, prepare, then speak about the topic.',
  interactive: 'Answer the question as you would in a real conversation.',
  'speaking-sample': 'Speak about the topic below for as long as you can (up to the time limit).',
};

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function QuestionPrompt({ question, showMeta = true, readAloud = false, compact = false }: { question: Question; showMeta?: boolean; readAloud?: boolean; compact?: boolean }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (readAloud && question.type === 'interactive') speak(question.text);
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [question.id, question.text, question.type, readAloud]);

  return (
    <div className="space-y-4">
      {showMeta && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{TYPE_LABELS[question.type]}</Badge>
          <Badge>{TOPIC_LABELS[question.topic]}</Badge>
          <Badge tone="neutral" className="capitalize">{question.difficulty}</Badge>
        </div>
      )}
      {!compact && <p className="text-sm text-slate-500 dark:text-slate-400">{INSTRUCTIONS[question.type]}</p>}

      {question.type === 'photo' && question.image && (
        imgError ? (
          <div className="flex aspect-[8/5] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">Image "{question.image}" could not be loaded.</div>
        ) : (
          <img
            src={imageUrl(question.image)}
            alt="Scene to describe"
            onError={() => setImgError(true)}
            className="mx-auto max-h-[46vh] w-full rounded-2xl border border-slate-200 object-contain dark:border-slate-800"
          />
        )
      )}

      {question.type === 'interactive' ? (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><MessagesSquare className="h-5 w-5" /></div>
          <div className="relative rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-lg font-medium text-slate-900 dark:bg-slate-800 dark:text-white">
            {question.text}
            <button onClick={() => speak(question.text)} aria-label="Read question aloud" className="ml-2 inline-flex align-middle text-slate-400 hover:text-brand-600">
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : question.type !== 'photo' ? (
        <p className="text-xl font-semibold leading-snug text-slate-900 dark:text-white">{question.text}</p>
      ) : null}

      {question.cues && question.cues.length > 0 && (
        <ul className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          {question.cues.map((c) => (
            <li key={c} className="flex gap-2"><span className="text-brand-500">•</span>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
