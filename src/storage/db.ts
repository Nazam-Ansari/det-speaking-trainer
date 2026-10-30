import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attempt, Settings, StoredRecording, TestResult } from '../types';

interface TrainerDB extends DBSchema {
  attempts: { key: string; value: Attempt; indexes: { createdAt: number; sessionId: string; testId: string } };
  tests: { key: string; value: TestResult; indexes: { finishedAt: number } };
  recordings: { key: string; value: StoredRecording };
  settings: { key: string; value: Settings };
}

const DB_NAME = 'det-speaking-trainer';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TrainerDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TrainerDB>> {
  if (!dbPromise) {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available in this browser, so practice history cannot be saved.'));
    }
    dbPromise = openDB<TrainerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const attempts = db.createObjectStore('attempts', { keyPath: 'id' });
        attempts.createIndex('createdAt', 'createdAt');
        attempts.createIndex('sessionId', 'sessionId');
        attempts.createIndex('testId', 'testId');
        const tests = db.createObjectStore('tests', { keyPath: 'id' });
        tests.createIndex('finishedAt', 'finishedAt');
        db.createObjectStore('recordings', { keyPath: 'id' });
        db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

/** Lets the UI refresh when data changes (dashboard, history, etc.). */
const listeners = new Set<() => void>();
export function onDataChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

export function newId(prefix = ''): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${rand}` : rand;
}

// ---------- Attempts ----------

export async function saveAttempt(a: Attempt): Promise<void> {
  await (await getDB()).put('attempts', a);
  notify();
}

export async function getAttempt(id: string): Promise<Attempt | undefined> {
  return (await getDB()).get('attempts', id);
}

/** All attempts, newest first. */
export async function listAttempts(): Promise<Attempt[]> {
  const all = await (await getDB()).getAllFromIndex('attempts', 'createdAt');
  return all.reverse();
}

export async function listAttemptsForTest(testId: string): Promise<Attempt[]> {
  const all = await (await getDB()).getAllFromIndex('attempts', 'testId', testId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteAttempt(id: string): Promise<void> {
  const db = await getDB();
  const a = await db.get('attempts', id);
  const tx = db.transaction(['attempts', 'recordings'], 'readwrite');
  await tx.objectStore('attempts').delete(id);
  if (a?.recordingId) await tx.objectStore('recordings').delete(a.recordingId);
  await tx.done;
  notify();
}

// ---------- Tests ----------

export async function saveTest(t: TestResult): Promise<void> {
  await (await getDB()).put('tests', t);
  notify();
}

export async function getTest(id: string): Promise<TestResult | undefined> {
  return (await getDB()).get('tests', id);
}

export async function listTests(): Promise<TestResult[]> {
  const all = await (await getDB()).getAllFromIndex('tests', 'finishedAt');
  return all.reverse();
}

export async function deleteTest(id: string): Promise<void> {
  const db = await getDB();
  const attempts = await db.getAllFromIndex('attempts', 'testId', id);
  const tx = db.transaction(['tests', 'attempts', 'recordings'], 'readwrite');
  await tx.objectStore('tests').delete(id);
  for (const a of attempts) {
    await tx.objectStore('attempts').delete(a.id);
    if (a.recordingId) await tx.objectStore('recordings').delete(a.recordingId);
  }
  await tx.done;
  notify();
}

// ---------- Recordings ----------

export async function saveRecording(blob: Blob): Promise<string> {
  const id = newId('rec');
  await (await getDB()).put('recordings', { id, blob, mimeType: blob.type, createdAt: Date.now() });
  return id;
}

export async function getRecording(id: string): Promise<StoredRecording | undefined> {
  return (await getDB()).get('recordings', id);
}

export async function deleteAllRecordings(): Promise<void> {
  const db = await getDB();
  await db.clear('recordings');
  const tx = db.transaction('attempts', 'readwrite');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if (cursor.value.recordingId) await cursor.update({ ...cursor.value, recordingId: undefined });
    cursor = await cursor.continue();
  }
  await tx.done;
  notify();
}

// ---------- Settings ----------

export const DEFAULT_SETTINGS: Settings = {
  targetScore: 130,
  defaultDifficulty: 'intermediate',
  theme: 'system',
  saveRecordings: true,
  autoPlayback: false,
  readQuestionsAloud: true,
  transcriptionEngine: 'whisper',
  whisperModel: 'Xenova/whisper-base.en',
  practicePrepMultiplier: 1,
  autoStartRecording: true,
  timerBeeps: true,
  aiProvider: 'none',
  geminiKey: '',
  geminiModel: 'gemini-3.8-flash',
  groqKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  aiListenToAudio: true,
  aiExplainLanguage: 'english',
};

export async function loadSettings(): Promise<Settings> {
  try {
    const s = await (await getDB()).get('settings', 'settings');
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await (await getDB()).put('settings', s, 'settings');
}

// ---------- Danger zone ----------

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['attempts', 'tests', 'recordings'], 'readwrite');
  await Promise.all([tx.objectStore('attempts').clear(), tx.objectStore('tests').clear(), tx.objectStore('recordings').clear()]);
  await tx.done;
  notify();
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
}
