/** fetch with retries on rate limits (429) and temporary server errors, as free tiers are rate-limited. */
export async function fetchWithRetry(url: string, init: RequestInit, label: string, attempts = 4): Promise<Response> {
  let lastErr = '';
  for (let i = 0; i < attempts; i++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e) {
      lastErr = `${label}: network error (${(e as Error).message}). Check your internet connection.`;
      await sleep(1500 * (i + 1));
      continue;
    }
    if (res.ok) return res;
    const body = await res.text();
    lastErr = `${label} error ${res.status}: ${extractMessage(body)}`;
    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
      throw new Error(res.status === 401 || res.status === 403 ? `${label}: the API key was rejected. Check it in Settings → AI Coach.` : lastErr);
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || parseRetryDelay(body) || 4 * (i + 1);
      await sleep(Math.min(40, retryAfter) * 1000);
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr.includes('429') ? `${lastErr}. The free-tier limit was reached; wait a minute and try again.` : lastErr);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractMessage(body: string): string {
  try {
    const j = JSON.parse(body);
    return (j.error?.message ?? j.message ?? body).toString().slice(0, 300);
  } catch {
    return body.slice(0, 300);
  }
}

function parseRetryDelay(body: string): number | null {
  const m = body.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/) ?? body.match(/try again in (\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(Number(m[1])) : null;
}
