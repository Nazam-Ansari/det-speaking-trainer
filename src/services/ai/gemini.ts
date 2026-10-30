// Google Gemini (free tier via an AI Studio API key). Calls go directly from this browser to Google.
import { blobToBase64, toWav } from '../audio';
import { fetchWithRetry } from './http';
import { GEMINI_SCHEMA, parseFeedback, type AiFeedback } from './prompt';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface Part { text?: string; inlineData?: { mimeType: string; data: string } }

// Google retires model ids over time. When the saved one is gone, switch to the best current
// "flash" model and tell the app so it can save the new choice.
const replacements = new Map<string, string>();
let onModelReplaced: ((model: string) => void) | null = null;
export function setGeminiModelListener(fn: ((model: string) => void) | null) {
  onModelReplaced = fn;
}

/** Picks the newest stable "flash" model (fast and free-tier friendly) from a model list. */
export function pickGeminiModel(models: string[]): string | null {
  const version = (m: string) => Number(m.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const byNewest = [...models].sort((a, b) => version(b) - version(a));
  return byNewest.find((m) => /flash/.test(m) && !/lite|preview|exp|thinking|audio|native|latest/.test(m))
    ?? byNewest.find((m) => /flash/.test(m))
    ?? byNewest[0]
    ?? null;
}

async function generate(key: string, model: string, system: string, parts: Part[], json: boolean): Promise<string> {
  const current = replacements.get(model) ?? model;
  try {
    return await generateWith(key, current, system, parts, json);
  } catch (e) {
    if (!/error 404/.test((e as Error).message)) throw e;
    const next = pickGeminiModel((await geminiModels(key)).filter((m) => m !== current));
    if (!next) throw e;
    replacements.set(model, next);
    onModelReplaced?.(next);
    return generateWith(key, next, system, parts, json);
  }
}

async function generateWith(key: string, model: string, system: string, parts: Part[], json: boolean): Promise<string> {
  const res = await fetchWithRetry(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: json
        ? { responseMimeType: 'application/json', responseSchema: GEMINI_SCHEMA, temperature: 0.3 }
        : { temperature: 0 },
    }),
  }, 'Gemini');
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: Part) => p.text ?? '').join('');
  if (!text) throw new Error(`Gemini returned no text${data.promptFeedback?.blockReason ? ` (blocked: ${data.promptFeedback.blockReason})` : ''}.`);
  return text;
}

async function audioPart(blob: Blob): Promise<Part> {
  return { inlineData: { mimeType: 'audio/wav', data: await blobToBase64(await toWav(blob)) } };
}

export async function geminiTranscribe(key: string, model: string, blob: Blob): Promise<string> {
  const system = 'You are a precise speech-to-text transcriber for English learners.';
  const text = await generate(key, model, system, [
    { text: 'Transcribe this English speech exactly as spoken. Keep the speaker\'s grammar mistakes, repetitions, false starts and filler words (um, uh). Do NOT correct anything. Add normal punctuation. Return only the transcript text, nothing else. If there is no speech, return an empty string.' },
    await audioPart(blob),
  ], false);
  return text.trim().replace(/^"|"$/g, '');
}

export async function geminiEvaluate(key: string, model: string, system: string, user: string, audio: Blob | null): Promise<AiFeedback> {
  const parts: Part[] = [{ text: user }];
  if (audio) parts.push(await audioPart(audio));
  return parseFeedback(await generate(key, model, system, parts, true));
}

/** Lists text-generation models available to this key (also validates the key). */
export async function geminiModels(key: string): Promise<string[]> {
  const res = await fetchWithRetry(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } }, 'Gemini', 1);
  const data = await res.json();
  return (data.models ?? [])
    .filter((m: { name: string; supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent') && /gemini/.test(m.name) && !/embedding|tts|image|live/.test(m.name))
    .map((m: { name: string }) => m.name.replace(/^models\//, ''));
}
