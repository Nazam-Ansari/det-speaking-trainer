import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Headphones, Lightbulb, ListOrdered, NotebookPen } from 'lucide-react';
import { FRAMEWORKS, FULL_SECONDS } from '../data/speakingFrameworks';
import { FrameworkTimeline, type GuideLang } from '../components/SpeakingGuide';
import { ListenButton } from '../components/QuestionPrompt';
import { words as wordList } from '../engines/evaluation/text';
import { Button, Card, CardHeader, PageHeader, Segmented } from '../components/ui';
import { cn, formatSeconds } from '../utils/format';

const BASICS: { en: string; ur: string }[] = [
  { en: 'Three minutes is about 350–400 words. Nobody can say that in one long idea, so split the answer into 5 short parts.', ur: '3 minute taqreeban 350–400 lafz hain. Itna ek hi idea mein nahi bola ja sakta, is liye jawab ko 5 chhote hisson mein baanto.' },
  { en: 'First decide the question type (opinion, describe, advantages…). Each type has its own 5 parts below.', ur: 'Pehle sawal ki qism pehchano (opinion, describe, advantages…). Har qism ke apne 5 hisse neeche diye hain.' },
  { en: 'In the 30 seconds of prep, do NOT write sentences. Write one keyword for each part: 5 keywords = your whole answer.', ur: '30 second ki tayyari mein jumle mat likho. Har hisse ke liye sirf ek keyword likho: 5 keywords = poora jawab.' },
  { en: 'Every reason needs an example. "For example, last year I…" easily adds 20–30 seconds of good speaking.', ur: 'Har wajah ke saath misaal do. "For example, last year I…" asani se 20–30 second ka acha bolna barha deta hai.' },
  { en: 'Watch the clock: if you are still on part 2 at 1:30, skip to the other side and the conclusion.', ur: 'Waqt dekhte raho: agar 1:30 par abhi bhi hissa 2 par ho, to seedha doosre pehlu aur conclusion par jao.' },
  { en: 'Out of ideas? Say "Let me give you another example…" or tell a short personal story. Never stop early — aim for at least 2 minutes.', ur: 'Ideas khatam? "Let me give you another example…" kaho ya chhoti si zaati kahani sunao. Jaldi band mat karo — kam az kam 2 minute bolo.' },
];

export function LearnPage() {
  const [id, setId] = useState(FRAMEWORKS[0].id);
  const [lang, setLang] = useState<GuideLang>('english');
  const fw = FRAMEWORKS.find((f) => f.id === id)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="How to speak for 3 minutes"
        subtitle="Split every Speaking Sample answer into parts, and know how long to spend on each one."
        action={<Segmented value={lang} onChange={setLang} options={[{ value: 'english', label: 'English' }, { value: 'roman-urdu', label: 'Roman Urdu' }]} />}
      />

      <Card>
        <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="The basics" />
        <ol className="space-y-2 text-sm">
          {BASICS.map((b, i) => (
            <li key={b.en} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{i + 1}</span>
              {lang === 'english' ? b.en : b.ur}
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardHeader icon={<ListOrdered className="h-4 w-4" />} title="Pick the question type" subtitle="Each type is divided into 5 parts. Times are for a 3-minute answer." />
        <div className="mb-5 flex flex-wrap gap-2">
          {FRAMEWORKS.map((f) => (
            <button
              key={f.id}
              onClick={() => setId(f.id)}
              className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors', f.id === id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300')}
            >
              {f.title.replace(/ \(.*/, '')}
            </button>
          ))}
        </div>

        <h3 className="text-lg font-semibold">{fw.title}</h3>
        <p className="mb-4 text-sm text-slate-500">Questions like: {fw.looksLike}</p>

        <FrameworkTimeline framework={fw} className="mb-1" />
        <div className="mb-5 flex justify-between text-[11px] tabular-nums text-slate-400"><span>0:00</span><span>1:00</span><span>2:00</span><span>{formatSeconds(FULL_SECONDS)}</span></div>

        <ol className="space-y-3">
          {fw.parts.map((p, i) => (
            <li key={p.name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{i + 1}. {p.name}</p>
                <span className="flex items-center gap-1 text-xs tabular-nums text-slate-500"><Clock className="h-3.5 w-3.5" /> {formatSeconds(p.from)}–{formatSeconds(p.to)} · about {p.to - p.from}s</span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{lang === 'english' ? p.what : p.urdu}</p>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {p.phrases.map((ph) => <span key={ph} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{ph}</span>)}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardHeader icon={<NotebookPen className="h-4 w-4" />} title="Worked example: a 5-keyword plan" subtitle="This is what your 30 seconds of prep should produce." />
        <p className="mb-3 rounded-xl bg-slate-50 p-3 font-medium dark:bg-slate-800/60">{fw.example.question}</p>
        <ol className="space-y-1.5 text-sm">
          {fw.example.plan.map((line, i) => (
            <li key={line} className="flex gap-2"><span className="w-12 shrink-0 tabular-nums text-xs text-slate-400">{formatSeconds(fw.parts[i].from)}</span>{line}</li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardHeader
          icon={<Headphones className="h-4 w-4" />}
          title="Full sample answer"
          subtitle={`The same plan spoken in full — about ${wordList(fw.example.sample.join(' ')).length} words, roughly 2 minutes at a calm pace.`}
          action={<ListenButton text={fw.example.sample.join(' ')} label="Listen to all" />}
        />
        <ol className="space-y-3">
          {fw.example.sample.map((para, i) => (
            <li key={para} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{i + 1}. {fw.parts[i].name}</p>
                <ListenButton text={para} label="Listen" />
              </div>
              <p className="text-[15px] leading-relaxed">{para}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Now try it</p>
          <p className="text-sm text-slate-500">In Speaking Sample practice, your plan and a live timeline appear next to the question and show which part you should be on.</p>
        </div>
        <Link to="/practice/speaking-sample"><Button>Practise Speaking Sample <ArrowRight className="h-4 w-4" /></Button></Link>
      </Card>
    </div>
  );
}
