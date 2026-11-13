export async function postJson<T>(
  url: string,
  payload: unknown,
  options?: {
    signal?: AbortSignal;
    fallbackError?: string;
  }
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let parsed: unknown = null;
  if (rawText.trim()) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const preview = rawText.replace(/\s+/g, ' ').trim().slice(0, 80);
      throw new Error(
        options?.fallbackError ||
          `Server returned an unexpected response (HTTP ${res.status}${preview ? `: ${preview}` : ''}). Please verify API deployment and try again.`
      );
    }
  }

  if (!res.ok) {
    const serverError =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : options?.fallbackError || `Request failed (HTTP ${res.status}).`;
    throw new Error(serverError);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(options?.fallbackError || 'Server returned an empty response.');
  }

  return parsed as T;
}
