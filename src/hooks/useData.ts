import { useEffect, useState } from 'react';
import type { Attempt, TestResult } from '../types';
import { listAttempts, listTests, onDataChange } from '../storage/db';

interface DataState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

function useLive<T>(loader: () => Promise<T>, initial: T): DataState<T> {
  const [state, setState] = useState<DataState<T>>({ data: initial, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    const run = () =>
      loader()
        .then((data) => alive && setState({ data, loading: false, error: null }))
        .catch((e: Error) => alive && setState((s) => ({ ...s, loading: false, error: e.message })));
    run();
    const off = onDataChange(run);
    return () => {
      alive = false;
      off();
    };
    // loader identity is stable (module functions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

/** All attempts (newest first), refreshed whenever data changes. */
export function useAttempts() {
  return useLive<Attempt[]>(listAttempts, []);
}

export function useTests() {
  return useLive<TestResult[]>(listTests, []);
}
