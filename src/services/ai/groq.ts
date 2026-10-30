// Groq (free tier via a GroqCloud API key): Whisper large-v3 transcription + open LLMs for feedback.
import { fetchWithRetry } from './http';
import { parseFeedback, type AiFeedback } from './prompt';

const BASE = 'https://api.groq.com/openai/v1';
export const GROQ_TRANSCRIBE_MODEL = 'whisper-large-v3-turbo';

// Groq retires models over time. When the saved one is gone, switch to an available replacement
// (and tell the app, so it can save a new chat model choice).
const replacements = new Map<string, string>();
let onModelReplaced: ((model: string) => void) | null = null;
export function setGroqModelListener(fn: ((model: string) => void) | null) {
  onModelReplaced = fn;
}
const RETIRED = /error (404|400).*(does not exist|decommissioned|not found)/i;

export async function groqTranscribe(key: string, blob: Blob): Promise<string> {
  const current = replacements.get(GROQ_TRANSCRIBE_MODEL) ?? GROQ_TRANSCRIBE_MODEL;
  try {
    return await transcribeWith(key, current, blob);
  } catch (e) {
    if (!RETIRED.test((e as Error).message)) throw e;
    const res = await fetchWithRetry(`${BASE}/models`, { headers: { Authorization: `Bearer ${key}` } }, 'Groq', 1);
    const ids: string[] = ((await res.json()).data ?? []).map((m: { id: string }) => m.id);
    const next = ids.filter((id) => /whisper/i.test(id) && id !== current).sort((a, b) => Number(/turbo/.test(b)) - Number(/turbo/.test(a)))[0];
    if (!next) throw e;
    replacements.set(GROQ_TRANSCRIBE_MODEL, next);
    return transcribeWith(key, next, blob);
  }
}

async function transcribeWith(key: string, model: string, blob: Blob): Promise<string> {
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : blob.type.includes('wav') ? 'wav' : 'webm';
  const form = new FormData();
  form.append('file', blob, `answer.${ext}`);
  form.append('model', model);
  form.append('language', 'en');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  // A prompt containing hesitations nudges Whisper to keep fillers instead of cleaning them up.
  form.append('prompt', 'Um, so, uh, I think... I mean, like, I go there yesterday and, um, it was good.');
  const res = await fetchWithRetry(`${BASE}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form }, 'Groq');
  const data = await res.json();
  return String(data.text ?? '').trim();
}

/** Picks the largest general chat model (by parameter count in its name) from a model list. */
export function pickGroqModel(models: string[]): string | null {
  const size = (m: string) => Math.max(0, ...[...m.matchAll(/(\d+)b/gi)].map((x) => Number(x[1])));
  const usable = models.filter((m) => !/compound|instant|vision|saba|allam/i.test(m));
  return [...(usable.length ? usable : models)].sort((a, b) => size(b) - size(a) || a.localeCompare(b))[0] ?? null;
}

export async function groqEvaluate(key: string, model: string, system: string, user: string): Promise<AiFeedback> {
  const current = replacements.get(model) ?? model;
  try {
    return await evaluateWith(key, current, system, user);
  } catch (e) {
    if (!RETIRED.test((e as Error).message)) throw e;
    const next = pickGroqModel((await groqModels(key)).filter((m) => m !== current));
    if (!next) throw e;
    replacements.set(model, next);
    onModelReplaced?.(next);
    return evaluateWith(key, next, system, user);
  }
}

async function evaluateWith(key: string, model: string, system: string, user: string): Promise<AiFeedback> {
  const res = await fetchWithRetry(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  }, 'Groq');
  const data = await res.json();
  return parseFeedback(data.choices?.[0]?.message?.content ?? '');
}

/** Lists chat models available to this key (also validates the key). */
export async function groqModels(key: string): Promise<string[]> {
  const res = await fetchWithRetry(`${BASE}/models`, { headers: { Authorization: `Bearer ${key}` } }, 'Groq', 1);
  const data = await res.json();
  return (data.data ?? [])
    .map((m: { id: string }) => m.id)
    .filter((id: string) => !/whisper|tts|guard|playai|orpheus|distil/i.test(id))
    .sort();
}
