// Text utilities shared by the evaluation modules.

export function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+(?:['’][a-z]+)?/g) ?? []).map((w) => w.replace('’', "'"));
}

export function hasPunctuation(text: string): boolean {
  return /[.!?]/.test(text);
}

/**
 * Splits a transcript into sentences. Browser speech recognition usually returns no
 * punctuation, so unpunctuated text is chunked at discourse markers instead.
 */
export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (hasPunctuation(clean)) {
    return (clean.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [clean]).map((s) => s.trim()).filter(Boolean);
  }
  const tokens = clean.split(' ');
  const markers = new Set(['so', 'then', 'but', 'also', 'and', 'first', 'second', 'finally', 'because', 'however', 'actually']);
  const out: string[] = [];
  let cur: string[] = [];
  for (const t of tokens) {
    if (cur.length >= 12 && markers.has(t.toLowerCase()) && t.toLowerCase() !== 'because') {
      out.push(cur.join(' '));
      cur = [];
    }
    cur.push(t);
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}

/** Very small suffix-stripping stemmer – good enough for keyword matching. */
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/'s$/, '');
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  for (const suf of ['ing', 'ed', 'es', 'ly', 's']) {
    if (w.length > suf.length + 3 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  // collapse doubled final consonant (running -> runn -> run)
  if (/([b-df-hj-np-tv-z])\1$/.test(w)) w = w.slice(0, -1);
  return w;
}

export function capitalizeSentence(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

export function ensureEndPunctuation(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /[.!?]["')\]]*$/.test(t) ? t : `${t}.`;
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Linear interpolation of x from [x0,x1] onto [y0,y1], clamped. */
export function scale(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y1;
  const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  return y0 + t * (y1 - y0);
}

/** Moving-average type–token ratio; more stable than TTR for different lengths. */
export function mattr(tokens: string[], window = 40): number {
  if (tokens.length === 0) return 0;
  if (tokens.length <= window) return new Set(tokens).size / tokens.length;
  let sum = 0;
  let n = 0;
  for (let i = 0; i + window <= tokens.length; i++) {
    sum += new Set(tokens.slice(i, i + window)).size / window;
    n++;
  }
  return sum / n;
}

export function countPhrase(text: string, phrase: string): number {
  const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'gi');
  return (text.match(re) ?? []).length;
}
