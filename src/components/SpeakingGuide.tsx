import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { FULL_SECONDS, frameworkFor, type SpeakingFramework } from '../data/speakingFrameworks';
import { cn, formatSeconds } from '../utils/format';
import { Segmented } from './ui';

export type GuideLang = 'english' | 'roman-urdu';

/** Coloured bar showing each part's time slot, with a moving marker while recording. */
export function FrameworkTimeline({ framework, total = FULL_SECONDS, elapsed, className }: { framework: SpeakingFramework; total?: number; elapsed?: number | null; className?: string }) {
  const k = total / FULL_SECONDS;
  return (
    <div className={cn('relative', className)}>
      <div className="flex h-7 overflow-hidden rounded-lg text-[10px] font-medium text-white">
        {framework.parts.map((p, i) => {
          const active = elapsed != null && elapsed >= p.from * k && elapsed < p.to * k;
          return (
            <div
              key={p.name}
              title={`${p.name}: ${formatSeconds(Math.round(p.from * k))}–${formatSeconds(Math.round(p.to * k))}`}
              className={cn('flex items-center justify-center truncate border-r border-white/40 px-1 last:border-r-0', i % 2 ? 'bg-brand-500' : 'bg-brand-600', active && 'bg-amber-500 ring-2 ring-inset ring-amber-300')}
              style={{ width: `${((p.to - p.from) / FULL_SECONDS) * 100}%` }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      {elapsed != null && (
        <span className="absolute -top-1 h-9 w-0.5 bg-slate-900 transition-[left] dark:bg-white" style={{ left: `${Math.min(100, (elapsed / total) * 100)}%` }} />
      )}
    </div>
  );
}

/** Practice-mode helper for Speaking Sample: the plan during prep, the current part while speaking. */
export function SpeakingGuide({ question, total, elapsed }: { question: string; total: number; elapsed: number | null }) {
  const framework = frameworkFor(question);
  const [lang, setLang] = useState<GuideLang>('english');
  const k = total / FULL_SECONDS;
  const current = elapsed == null ? -1 : framework.parts.findIndex((p) => elapsed >= p.from * k && elapsed < p.to * k);

  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900 dark:bg-brand-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Compass className="h-4 w-4 text-brand-600" /> Your plan · {framework.title}</p>
        <Segmented value={lang} onChange={setLang} options={[{ value: 'english', label: 'English' }, { value: 'roman-urdu', label: 'Urdu' }]} />
      </div>
      <FrameworkTimeline framework={framework} total={total} elapsed={elapsed} />
      <ol className="space-y-1.5 text-sm">
        {framework.parts.map((p, i) => (
          <li key={p.name} className={cn('rounded-lg px-2 py-1.5', i === current && 'bg-amber-100 dark:bg-amber-900/40')}>
            <span className="font-medium">{i + 1}. {p.name}</span>{' '}
            <span className="tabular-nums text-xs text-slate-500">{formatSeconds(Math.round(p.from * k))}–{formatSeconds(Math.round(p.to * k))}</span>
            <p className="text-slate-600 dark:text-slate-400">{lang === 'english' ? p.what : p.urdu}</p>
            {i === current && <p className="mt-0.5 text-xs italic text-slate-500">Try: {p.phrases.join(' · ')}</p>}
          </li>
        ))}
      </ol>
      <Link to="/learn" className="text-xs font-medium text-brand-600 hover:underline">How to speak for 3 minutes →</Link>
    </div>
  );
}
