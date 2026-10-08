/** Thin, failure-tolerant wrappers around optional browser capabilities. */

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Unsupported or blocked: haptics are a nicety.
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

let fallbackId = 0;

export function createId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // randomUUID needs a secure context; ids only have to be unique locally.
    return `${Date.now().toString(36)}-${(fallbackId++).toString(36)}`;
  }
}
