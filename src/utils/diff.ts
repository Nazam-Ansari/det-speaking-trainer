export type DiffPart = { type: 'same' | 'added' | 'removed'; text: string };

/** Word-level LCS diff used to highlight corrections. */
export function diffWords(a: string, b: string): DiffPart[] {
  const x = a.split(/(\s+)/).filter((t) => t.trim());
  const y = b.split(/(\s+)/).filter((t) => t.trim());
  const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:"']/g, '');
  const n = x.length;
  const m = y.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = norm(x[i]) === norm(y[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += ` ${text}`;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(x[i]) === norm(y[j])) { push('same', y[j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('removed', x[i]); i++; }
    else { push('added', y[j]); j++; }
  }
  while (i < n) push('removed', x[i++]);
  while (j < m) push('added', y[j++]);
  return out;
}
