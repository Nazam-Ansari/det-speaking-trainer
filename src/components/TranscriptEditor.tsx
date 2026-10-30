import { Pencil, RotateCcw } from 'lucide-react';
import type { TranscriptSource } from '../types';
import { Badge, Button } from './ui';

const SOURCE_LABEL: Record<TranscriptSource, string> = {
  whisper: 'Whisper (local)',
  'web-speech': 'Browser speech recognition',
  manual: 'Typed manually',
  gemini: 'Gemini AI',
  groq: 'Groq Whisper large-v3',
};

export function TranscriptEditor({
  original, value, onChange, source, disabled,
}: { original: string; value: string; onChange: (v: string) => void; source: TranscriptSource; disabled?: boolean }) {
  const edited = value.trim() !== original.trim();
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="transcript" className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
          <Pencil className="h-4 w-4 text-slate-400" /> Transcript
          <Badge>{SOURCE_LABEL[source]}</Badge>
          {edited && original && <Badge tone="amber">Edited</Badge>}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{wordCount} words</span>
          {edited && original && (
            <Button size="sm" variant="ghost" onClick={() => onChange(original)}>
              <RotateCcw className="h-3.5 w-3.5" /> Original
            </Button>
          )}
        </div>
      </div>
      <textarea
        id="transcript"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder={source === 'manual' ? 'Listen to your recording and type exactly what you said, including mistakes…' : 'Transcript will appear here…'}
        className="w-full resize-y p-3 text-[15px] leading-relaxed"
      />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Fix words the transcriber <em>misheard</em>, but keep your own grammar mistakes. Feedback is only useful if the transcript matches what you actually said.
        {edited && original && ' The original transcript is kept separately.'}
      </p>
    </div>
  );
}
