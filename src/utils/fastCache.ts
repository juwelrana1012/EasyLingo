const memoryCache = new Map<string, unknown>();
const STORAGE_PREFIX = 'lb_fast_cache_v1_';

export function getFastCache<T>(namespace: string, key: string): T | null {
  const fullKey = `${namespace}:${key}`;
  const memHit = memoryCache.get(fullKey);
  if (memHit !== undefined) return memHit as T;

  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + fullKey);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      memoryCache.set(fullKey, parsed);
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function setFastCache(namespace: string, key: string, value: unknown) {
  const fullKey = `${namespace}:${key}`;
  if (memoryCache.size > 300) {
    const first = memoryCache.keys().next().value;
    if (first) memoryCache.delete(first);
  }
  memoryCache.set(fullKey, value);

  try {
    sessionStorage.setItem(STORAGE_PREFIX + fullKey, JSON.stringify(value));
  } catch {
    // ignore quota exceeded
  }
}
