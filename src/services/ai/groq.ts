// Groq (free tier via a GroqCloud API key): Whisper large-v3 transcription + open LLMs for feedback.
import { fetchWithRetry } from './http';
import { parseFeedback, type AiFeedback } from './prompt';

const BASE = 'https://api.groq.com/openai/v1';
export const GROQ_TRANSCRIBE_MODEL = 'whisper-large-v3-turbo';

export async function groqTranscribe(key: string, blob: Blob): Promise<string> {
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : blob.type.includes('wav') ? 'wav' : 'webm';
  const form = new FormData();
  form.append('file', blob, `answer.${ext}`);
  form.append('model', GROQ_TRANSCRIBE_MODEL);
  form.append('language', 'en');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  // A prompt containing hesitations nudges Whisper to keep fillers instead of cleaning them up.
  form.append('prompt', 'Um, so, uh, I think... I mean, like, I go there yesterday and, um, it was good.');
  const res = await fetchWithRetry(`${BASE}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form }, 'Groq');
  const data = await res.json();
  return String(data.text ?? '').trim();
}

export async function groqEvaluate(key: string, model: string, system: string, user: string): Promise<AiFeedback> {
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
