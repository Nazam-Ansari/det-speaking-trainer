import { useEffect, useState } from 'react';
import { getRecording } from '../storage/db';
import { useObjectUrl } from '../hooks/useObjectUrl';

export function RecordingPlayer({ recordingId }: { recordingId?: string }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [missing, setMissing] = useState(false);
  const url = useObjectUrl(blob);

  useEffect(() => {
    setBlob(null);
    setMissing(false);
    if (!recordingId) return;
    getRecording(recordingId).then((r) => (r ? setBlob(r.blob) : setMissing(true))).catch(() => setMissing(true));
  }, [recordingId]);

  if (!recordingId) return <p className="text-sm text-slate-400">No recording saved (recording storage was off).</p>;
  if (missing) return <p className="text-sm text-slate-400">Recording no longer available.</p>;
  return url ? <audio src={url} controls /> : null;
}
