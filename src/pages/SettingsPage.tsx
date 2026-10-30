import { useEffect, useState } from 'react';
import { Database, Mic, Palette, Timer, Trash2, Volume2 } from 'lucide-react';
import type { Difficulty, TranscriptionEngineId } from '../types';
import { useSettings } from '../hooks/useSettings';
import { clearAllData, deleteAllRecordings, onDataChange, storageEstimate } from '../storage/db';
import { engineInfo, WHISPER_MODELS } from '../services/transcription';
import { WhisperPreloader, MicCheck } from '../components/MicCheck';
import { AiCoachSettings } from '../components/AiCoachSettings';
import { Badge, Button, Card, CardHeader, ConfirmDialog, PageHeader, Segmented, Toggle } from '../components/ui';
import { cn, formatBytes } from '../utils/format';

export function SettingsPage() {
  const { settings, update } = useSettings();
  const [confirm, setConfirm] = useState<'all' | 'recordings' | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const engines = engineInfo(settings);

  useEffect(() => {
    const refresh = () => void storageEstimate().then(setUsage);
    refresh();
    return onDataChange(refresh);
  }, []);

  const runConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    if (c === 'all') await clearAllData();
    if (c === 'recordings') await deleteAllRecordings();
    setDone(c === 'all' ? 'All local practice data was deleted.' : 'All recordings were deleted.');
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Everything is stored locally in this browser." />
      <div className="grid gap-5 lg:grid-cols-2">
        <AiCoachSettings settings={settings} update={update} />

        <Card className="space-y-5">
          <CardHeader icon={<Palette className="h-4 w-4" />} title="Goals & appearance" />
          <label className="block text-sm font-medium">
            Target DET score
            <input
              type="number" min={10} max={160} step={5} value={settings.targetScore}
              onChange={(e) => update({ targetScore: Math.max(10, Math.min(160, Number(e.target.value) || 130)) })}
              className="mt-1 block h-10 w-32 px-3"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Shown on the dashboard as your goal.</span>
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Default difficulty</p>
            <Segmented<Difficulty> value={settings.defaultDifficulty} onChange={(v) => update({ defaultDifficulty: v })} options={[
              { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' },
            ]} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Theme</p>
            <Segmented value={settings.theme} onChange={(v) => update({ theme: v })} options={[
              { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' },
            ]} />
          </div>
        </Card>

        <Card className="space-y-5">
          <CardHeader icon={<Timer className="h-4 w-4" />} title="Timers" />
          <div>
            <p className="mb-2 text-sm font-medium">Practice preparation time</p>
            <Segmented value={String(settings.practicePrepMultiplier)} onChange={(v) => update({ practicePrepMultiplier: Number(v) })} options={[
              { value: '0', label: 'None' }, { value: '1', label: 'Test-like' }, { value: '1.5', label: '1.5×' }, { value: '2', label: '2×' },
            ]} />
            <p className="mt-1 text-xs text-slate-500">Applies to Practice Mode only. Full Test Mode always uses the configured test timers.</p>
          </div>
          <Toggle checked={settings.autoStartRecording} onChange={(v) => update({ autoStartRecording: v })} label="Start recording automatically after preparation" description="Off: you press “Start recording” yourself (Practice Mode only)." />
          <Toggle checked={settings.timerBeeps} onChange={(v) => update({ timerBeeps: v })} label="Beep when recording starts and stops" />
        </Card>

        <Card className="space-y-5">
          <CardHeader icon={<Volume2 className="h-4 w-4" />} title="Audio" />
          <Toggle checked={settings.saveRecordings} onChange={(v) => update({ saveRecordings: v })} label="Save recordings" description="Store audio with each answer so you can listen again in History. Uses browser storage." />
          <Toggle checked={settings.autoPlayback} onChange={(v) => update({ autoPlayback: v })} label="Play my recording back automatically" description="In Practice Mode, play your answer as soon as you stop recording." />
          <Toggle checked={settings.readQuestionsAloud} onChange={(v) => update({ readQuestionsAloud: v })} label="Read Interactive Speaking questions aloud" description="Uses your browser's text-to-speech voice." />
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-2 text-sm font-medium">Microphone test</p>
            <MicCheck onResult={() => undefined} />
          </div>
        </Card>

        <Card className="space-y-4">
          <CardHeader icon={<Mic className="h-4 w-4" />} title="Speech transcription" subtitle="Transcription converts your speech to text. It does not assess pronunciation." />
          <div className="space-y-2" role="radiogroup">
            {engines.map((e) => (
              <button
                key={e.id}
                role="radio"
                aria-checked={settings.transcriptionEngine === e.id}
                disabled={!e.supported}
                onClick={() => update({ transcriptionEngine: e.id as TranscriptionEngineId })}
                className={cn('w-full rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  settings.transcriptionEngine === e.id ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{e.label}</span>
                  {e.local ? <Badge tone="brand">On-device</Badge> : <Badge tone="amber">Uses online service</Badge>}
                  {!e.supported && <Badge tone="rose">{e.unsupportedReason ?? 'Not supported in this browser'}</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{e.description}</p>
              </button>
            ))}
          </div>
          {settings.transcriptionEngine === 'whisper' && (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <label className="block text-sm font-medium">
                Whisper model
                <select value={settings.whisperModel} onChange={(e) => update({ whisperModel: e.target.value })} className="mt-1 block h-10 w-full px-3 text-sm font-normal">
                  {WHISPER_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
              <WhisperPreloader key={settings.whisperModel} model={settings.whisperModel} />
            </div>
          )}
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <CardHeader icon={<Database className="h-4 w-4" />} title="Local data" subtitle={usage ? `Browser storage used by this site: ${formatBytes(usage.usage)} of ${formatBytes(usage.quota)} available` : 'Stored in IndexedDB in this browser only.'} />
          {done && <p className="text-sm text-brand-600 dark:text-brand-400">{done}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirm('recordings')}><Trash2 className="h-4 w-4" /> Delete all recordings</Button>
            <Button variant="danger" onClick={() => setConfirm('all')}><Trash2 className="h-4 w-4" /> Clear all local data</Button>
          </div>
          <p className="text-xs text-slate-500">Clearing your browser's site data also deletes everything. There is no cloud backup.</p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title={confirm === 'all' ? 'Clear all local data?' : 'Delete all recordings?'}
        description={confirm === 'all' ? 'Every answer, test result and recording will be permanently deleted. Settings are kept.' : 'Audio files will be deleted. Transcripts and evaluations are kept.'}
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
    </>
  );
}
