/**
 * localStorage access that never throws. Storage can be missing, blocked
 * (private mode, strict cookie settings) or full; the app must keep working.
 */
const PREFIX = 'draw:';

export function loadJSON(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort.
  }
}
