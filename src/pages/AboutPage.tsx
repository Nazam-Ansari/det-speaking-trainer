import { CircleCheck, CircleHelp, MicOff, Scale, TriangleAlert } from 'lucide-react';
import { Badge, Card, CardHeader, KindBadge, PageHeader } from '../components/ui';

const DIMENSIONS = [
  ['Grammar', 'Rule-based checks for frequent learner errors (articles, subject–verb agreement, verb tenses after time markers, modal + base verb, collocations…), blended with grammatical range (complex structures). It cannot catch every error.'],
  ['Vocabulary', 'Lexical diversity (moving-average type–token ratio), the share of less-common words, and over-used general words such as "good", "very", "thing".'],
  ['Fluency indicators', 'Words per minute, filler words ("um", "uh", "you know"…), repeated words and how much of the time limit you used, all calculated from the transcript and timer.'],
  ['Answer relevance', 'Keyword overlap with the prompt and with topic words in the question bank. For photos, also location and speculation language. It does not understand meaning.'],
  ['Answer development', 'Length against the task target, plus reasons, examples, a clear opinion and a conclusion.'],
  ['Sentence structure', 'Sentence length, complex connectors, transitions, very long run-on sentences, and repetitive sentence openings.'],
];

export function AboutPage() {
  return (
    <>
      <PageHeader title="How scoring works" subtitle="What this trainer measures, what it estimates, and what it cannot do." />
      <div className="space-y-5">
        <Card>
          <CardHeader icon={<Scale className="h-4 w-4" />} title="Your score out of 160 is an estimate" />
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Each answer gets an internal score from 0 to 100, which is shown on a DET-style <strong>10–160 scale</strong> (in steps of 5) using a simple linear formula:
            <code className="mx-1 text-xs">10 + score × 1.5</code>. This is the app's own estimate. It is not produced by Duolingo and is not calibrated against
            real DET results, so your real test score may be higher or lower. Use it mainly to track <em>your own progress</em> over time.
            The six skill scores in "Show full details" stay on a 0–100 scale.
          </p>
        </Card>

        <Card>
          <CardHeader title="The six dimensions" subtitle="All six are heuristic estimates." action={<KindBadge kind="estimate" />} />
          <dl className="grid gap-4 md:grid-cols-2">
            {DIMENSIONS.map(([t, d]) => (
              <div key={t} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <dt className="font-medium">{t}</dt>
                <dd className="mt-1 text-sm text-slate-600 dark:text-slate-400">{d}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-slate-500">
            Weights for the overall Practice Score: grammar 22%, vocabulary 20%, fluency 18%, relevance 15%, development 15%, structure 10%. Very short answers are capped.
          </p>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader icon={<CircleCheck className="h-4 w-4" />} title="Measured vs estimated" />
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex gap-2"><KindBadge kind="measured" /> Directly counted: word count, words per minute, fillers, speaking time, sentence count.</li>
              <li className="flex gap-2"><KindBadge kind="estimate" /> Interpreted by rules: all six dimension scores and the Practice Score.</li>
            </ul>
          </Card>
          <Card>
            <CardHeader icon={<MicOff className="h-4 w-4" />} title="Pronunciation" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>Pronunciation assessment unavailable.</strong> A transcript tells us which words were recognised, not how they sounded. A word transcribed correctly
              can still be mispronounced, and vice versa. Rather than invent a number, the app shows no pronunciation score. Listen to your recordings to self-assess.
            </p>
          </Card>
          <Card>
            <CardHeader icon={<TriangleAlert className="h-4 w-4" />} title="Transcription limits" />
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Whisper sometimes “cleans up” speech: it may drop “um/uh” and occasionally fix small grammar slips, which can make feedback too kind.</li>
              <li>Browser speech recognition usually returns no punctuation, so sentence-level checks are approximate.</li>
              <li>Always correct <em>misheard</em> words in the transcript, but keep your real mistakes.</li>
            </ul>
          </Card>
          <Card>
            <CardHeader icon={<CircleHelp className="h-4 w-4" />} title="Questions & test format" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All questions are original practice prompts modelled on the publicly described DET speaking task types. They are not real or leaked exam items.
              Interactive Speaking uses a branching question bank with keyword rules; <Badge>no AI model</Badge> generates questions. The full-test structure lives in
              <code className="mx-1 text-xs">src/data/testConfig.json</code>.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
