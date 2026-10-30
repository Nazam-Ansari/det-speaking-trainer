import { useState } from 'react';
import { Bot, ExternalLink, KeyRound } from 'lucide-react';
import type { AiProvider, Settings } from '../types';
import { AI_PROVIDERS, geminiModels, groqModels, keyFor, pickGeminiModel } from '../services/ai';
import { Alert, Badge, Button, Card, CardHeader, Segmented, Toggle } from './ui';

/** Settings card for the optional free AI coach (Gemini or Groq, user-supplied key). */
export function AiCoachSettings({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  const [models, setModels] = useState<Partial<Record<AiProvider, string[]>>>({});
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const provider = settings.aiProvider === 'none' ? null : settings.aiProvider;

  const testKey = async (p: AiProvider) => {
    setTesting(true);
    setResult(null);
    try {
      const list = p === 'gemini' ? await geminiModels(keyFor(settings, p)) : await groqModels(keyFor(settings, p));
      setModels((m) => ({ ...m, [p]: list }));
      // Use the provider's accurate cloud transcription once the key is known to work,
      // and replace a saved Gemini model that Google no longer offers.
      const patch: Partial<Settings> = { transcriptionEngine: p };
      if (p === 'gemini' && !list.includes(settings.geminiModel)) patch.geminiModel = pickGeminiModel(list) ?? settings.geminiModel;
      update(patch);
      setResult({ ok: true, text: `Key works. ${list.length} models available${patch.geminiModel && patch.geminiModel !== settings.geminiModel ? `; switched to ${patch.geminiModel}` : ''}. Transcription is now set to ${AI_PROVIDERS[p].label}.` });
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const modelField = provider === 'gemini' ? 'geminiModel' : 'groqModel';
  const keyField = provider === 'gemini' ? 'geminiKey' : 'groqKey';
  const currentModel = provider ? settings[modelField] : '';
  const options = provider ? Array.from(new Set([currentModel, ...(models[provider] ?? [])])) : [];

  return (
    <Card className="space-y-5 lg:col-span-2">
      <CardHeader
        icon={<Bot className="h-4 w-4" />}
        title="AI Coach (free)"
        subtitle="Get Duolingo-style feedback from a real AI model. Both providers have a free tier; you only need a free API key."
      />
      <Segmented<Settings['aiProvider']>
        value={settings.aiProvider}
        onChange={(v) => { update({ aiProvider: v }); setResult(null); }}
        options={[
          { value: 'none', label: 'Off (offline rules)' },
          { value: 'gemini', label: 'Google Gemini' },
          { value: 'groq', label: 'Groq' },
        ]}
      />

      {provider ? (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>
              Open{' '}
              <a href={AI_PROVIDERS[provider].keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-600 underline dark:text-brand-400">
                {AI_PROVIDERS[provider].keyUrl.replace('https://', '')} <ExternalLink className="h-3 w-3" />
              </a>{' '}
              and sign in (free, no card needed).
            </li>
            <li>Create an API key and paste it below.</li>
            <li>Press <strong>Test key</strong>.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block text-sm font-medium">
              <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> {AI_PROVIDERS[provider].label} API key</span>
              <input
                type="password" autoComplete="off" spellCheck={false}
                value={settings[keyField]}
                onChange={(e) => { update({ [keyField]: e.target.value.trim() }); setResult(null); }}
                placeholder={AI_PROVIDERS[provider].keyHint}
                className="mt-1 block h-10 w-full px-3 font-mono text-sm font-normal"
              />
            </label>
            <Button variant="outline" onClick={() => void testKey(provider)} disabled={testing || !keyFor(settings, provider)}>
              {testing ? 'Testing…' : 'Test key'}
            </Button>
          </div>
          {result && (
            <Alert tone={result.ok ? 'success' : 'error'} title={result.ok ? undefined : 'Key test failed'}>
              {result.text}
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Model
              <select value={currentModel} onChange={(e) => update({ [modelField]: e.target.value })} className="mt-1 block h-10 w-full px-3 text-sm font-normal">
                {options.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {provider === 'gemini' ? 'A "flash" model is recommended (fast, free tier).' : 'llama-3.3-70b-versatile is recommended.'} Press Test key to load the full list.
              </span>
            </label>
            <label className="block text-sm font-medium">
              Explain feedback in
              <select value={settings.aiExplainLanguage} onChange={(e) => update({ aiExplainLanguage: e.target.value as Settings['aiExplainLanguage'] })} className="mt-1 block h-10 w-full px-3 text-sm font-normal">
                <option value="english">English</option>
                <option value="roman-urdu">Roman Urdu (English corrections, Urdu explanations)</option>
              </select>
            </label>
          </div>

          {provider === 'gemini' && (
            <Toggle
              checked={settings.aiListenToAudio}
              onChange={(v) => update({ aiListenToAudio: v })}
              label="Let the AI listen to my recording"
              description="Gemini hears your audio and comments on pronunciation and fluency. This is an AI opinion, not a measured pronunciation score."
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Badge tone="amber">Uses online service</Badge>
            <Badge>Score is still an unofficial estimate</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your key is saved only in this browser and sent only to {AI_PROVIDERS[provider].label}. Your transcript{provider === 'gemini' && settings.aiListenToAudio ? ' and recording' : ''} go to {AI_PROVIDERS[provider].label} for each answer.
            Free tiers have rate limits, and the provider may use free-tier data to improve its models. If an AI call fails, the app falls back to the offline rule-based feedback.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          AI is off. Feedback comes from the built-in offline rule engine, which is private but much simpler than a real AI.
        </p>
      )}
    </Card>
  );
}
