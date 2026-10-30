import { useEffect, useRef, useState } from 'react';

/**
 * Wall-clock countdown (robust to tab throttling). Calls onDone once when it reaches 0.
 * Pass running=false to pause/disable.
 */
export function useCountdown(seconds: number, running: boolean, onDone: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const endRef = useRef<number>(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!running) return;
    endRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    let fired = false;
    const id = window.setInterval(() => {
      const left = Math.max(0, (endRef.current - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        doneRef.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds, running]);

  return remaining;
}
