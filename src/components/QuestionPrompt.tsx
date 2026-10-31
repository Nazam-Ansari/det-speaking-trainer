import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { Question } from '../types';
import { imageUrl, TOPIC_LABELS, TYPE_LABELS } from '../data/questionBank';
import { cn } from '../utils/format';
import { Badge } from './ui';

const INSTRUCTIONS: Record<Question['type'], string> = {
  photo: 'Describe the image in as much detail as you can.',
  'read-then-speak': 'Read the prompt, prepare, then speak about the topic.',
  interactive: 'Answer the question as you would in a real conversation.',
  'speaking-sample': 'Speak about the topic below for as long as you can (up to the time limit).',
};

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, onSpeakingChange?: (speaking: boolean) => void) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  if (onSpeakingChange) {
    u.onstart = () => onSpeakingChange(true);
    u.onend = () => onSpeakingChange(false);
    u.onerror = () => onSpeakingChange(false);
  }
  window.speechSynthesis.speak(u);
}

/** Interactive Speaking: a character that says the question out loud, with the text hidden (like the real test). */
function SpeakingCharacter({ text, autoPlay, allowReveal }: { text: string; autoPlay: boolean; allowReveal: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    setShowText(false);
    if (autoPlay) speak(text, setSpeaking);
    return () => {
      if (canSpeak) window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [text, autoPlay]);

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative">
        {speaking && <span className="absolute inset-0 rounded-full bg-brand-400/40 animate-pulse-ring" />}
        <div
          role="img"
          aria-label={speaking ? 'Speaker is talking' : 'Speaker'}
          className={cn('relative flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-5xl dark:bg-brand-950', speaking && 'animate-talk')}
        >
          🧑‍🏫
        </div>
      </div>

      <div className="flex h-6 items-end gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn('w-1.5 rounded-full bg-brand-500 transition-all', speaking ? 'animate-sound-bar' : 'h-1.5 opacity-40')}
            style={speaking ? { animationDelay: `${i * 120}ms` } : undefined}
          />
        ))}
      </div>

      {canSpeak ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => speak(text, setSpeaking)}
            disabled={speaking}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Volume2 className="h-4 w-4" /> {speaking ? 'Speaking…' : 'Listen again'}
          </button>
          {allowReveal && (
            <button onClick={() => setShowText((v) => !v)} className="text-sm text-slate-400 underline hover:text-slate-600">
              {showText ? 'Hide text' : 'Show text'}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Your browser cannot speak, so the question is shown as text.</p>
      )}

      {(showText || !canSpeak) && (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-lg font-medium text-slate-900 dark:bg-slate-800 dark:text-white">{text}</p>
      )}
    </div>
  );
}

export function QuestionPrompt({ question, showMeta = true, readAloud = false, compact = false }: { question: Question; showMeta?: boolean; readAloud?: boolean; compact?: boolean }) {
  const [imgError, setImgError] = useState(false);

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
          <figure>
            <img
              src={imageUrl(question.image)}
              alt="Scene to describe"
              onError={() => setImgError(true)}
              className="mx-auto max-h-[46vh] w-full rounded-2xl border border-slate-200 object-contain dark:border-slate-800"
            />
            {question.imageCredit && (
              <figcaption className="mt-1 text-right text-[11px] text-slate-400">
                Photo: <a href={question.imageCredit.source} target="_blank" rel="noreferrer" className="underline">{question.imageCredit.author}</a>, {question.imageCredit.license}
              </figcaption>
            )}
          </figure>
        )
      )}

      {question.type === 'interactive' ? (
        <SpeakingCharacter text={question.text} autoPlay={readAloud} allowReveal={showMeta} />
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
