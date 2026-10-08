/**
 * Draw configuration, validation and result formatting. Framework-free.
 */
import { cryptoSource, randomInts, uniqueRandomInts, type RandomSource } from './random';

export type OutputMode = 'list' | 'sum' | 'joined';
export type DisplayStyle = 'number' | 'coin';

export interface DrawConfig {
  min: number;
  max: number;
  count: number;
  allowRepeats: boolean;
  mode: OutputMode;
  /** Sort ascending. Only applies in list mode. */
  sort: boolean;
  /** `coin` shows 1 as Heads and 2 as Tails. Only applies to a 1–2 list. */
  display: DisplayStyle;
}

export interface DrawResult {
  id: string;
  timestamp: number;
  config: DrawConfig;
  values: number[];
}

export type ConfigErrors = Partial<Record<'min' | 'max' | 'count', string>>;

export const LIMITS = {
  minValue: -999_999_999,
  maxValue: 999_999_999,
  minCount: 1,
  maxCount: 100,
} as const;

export const DEFAULT_CONFIG: DrawConfig = {
  min: 1,
  max: 6,
  count: 1,
  allowRepeats: true,
  mode: 'list',
  sort: false,
  display: 'number',
};

const OUTPUT_MODES: readonly OutputMode[] = ['list', 'sum', 'joined'];
const COIN_LABELS: Record<number, string> = { 1: 'Heads', 2: 'Tails' };

const inValueLimits = (n: number) =>
  Number.isInteger(n) && n >= LIMITS.minValue && n <= LIMITS.maxValue;

/** Uses U+2212 so negative bounds read cleanly next to the en dash. */
const formatBound = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));

export function formatRange(min: number, max: number): string {
  return min < 0 || max < 0 ? `${formatBound(min)} to ${formatBound(max)}` : `${min}–${max}`;
}

export function validateConfig(config: DrawConfig): ConfigErrors {
  const errors: ConfigErrors = {};
  const { min, max, count } = config;
  const valueHint = `Enter a whole number from ${formatBound(LIMITS.minValue)} to ${LIMITS.maxValue}`;

  if (!inValueLimits(min)) errors.min = valueHint;
  if (!inValueLimits(max)) errors.max = valueHint;
  if (!errors.min && !errors.max && min > max) {
    errors.max = 'Max must be at least the min';
  }

  if (!Number.isInteger(count) || count < LIMITS.minCount || count > LIMITS.maxCount) {
    errors.count = `Enter a whole number from ${LIMITS.minCount} to ${LIMITS.maxCount}`;
  } else if (!config.allowRepeats && !errors.min && !errors.max) {
    const size = max - min + 1;
    if (count > size) {
      const noun = size === 1 ? 'value' : 'values';
      errors.count = `Only ${size} unique ${noun} in ${formatRange(min, max)}. Lower the count or allow repeats.`;
    }
  }
  return errors;
}

export function isValidConfig(config: DrawConfig): boolean {
  return Object.keys(validateConfig(config)).length === 0;
}

export function firstError(errors: ConfigErrors): string | undefined {
  return errors.min ?? errors.max ?? errors.count;
}

/** Whether values are shown as Heads/Tails rather than digits. */
export function usesCoinLabels(config: DrawConfig): boolean {
  return (
    config.display === 'coin' && config.mode === 'list' && config.min === 1 && config.max === 2
  );
}

export function formatValue(value: number, config: DrawConfig): string {
  return usesCoinLabels(config) ? (COIN_LABELS[value] ?? String(value)) : String(value);
}

/** Generates the values for a valid config. Throws if the config is invalid. */
export function performDraw(config: DrawConfig, source: RandomSource = cryptoSource): number[] {
  const error = firstError(validateConfig(config));
  if (error) throw new RangeError(error);

  const { min, max, count } = config;
  const values = config.allowRepeats
    ? randomInts(min, max, count, source)
    : uniqueRandomInts(min, max, count, source);
  if (config.mode === 'list' && config.sort) values.sort((a, b) => a - b);
  return values;
}

export const sumValues = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

/** The headline result: what is shown large and what "copy" copies. */
export function resultText({ config, values }: Pick<DrawResult, 'config' | 'values'>): string {
  switch (config.mode) {
    case 'sum':
      return String(sumValues(values));
    case 'joined':
      return values.join('');
    case 'list':
      return values.map((v) => formatValue(v, config)).join(', ');
  }
}

/** Headline plus the working, for history rows. */
export function resultDetail(result: Pick<DrawResult, 'config' | 'values'>): string {
  const text = resultText(result);
  return result.config.mode === 'sum' && result.values.length > 1
    ? `${text} (${result.values.join(' + ')})`
    : text;
}

/** Spoken form for the aria-live region. */
export function announceResult(result: Pick<DrawResult, 'config' | 'values'>): string {
  const text = resultText(result);
  if (result.config.mode !== 'sum') return `Result: ${text}`;
  return result.values.length > 1
    ? `Total ${text}. Values: ${result.values.join(', ')}`
    : `Total ${text}`;
}

/** Compact one-line description, e.g. "3 numbers · 1–6 · sum". */
export function summarize(config: DrawConfig): string {
  const { count, min, max, mode } = config;
  if (!isValidConfig(config)) return 'Check settings';

  const many = count > 1;
  if (usesCoinLabels(config)) {
    return [many ? `${count} coin flips` : 'Coin flip', many && config.sort && 'sorted']
      .filter(Boolean)
      .join(' · ');
  }
  return [
    `${count} ${many ? 'numbers' : 'number'}`,
    formatRange(min, max),
    mode !== 'list' && mode,
    many && !config.allowRepeats && 'unique',
    many && mode === 'list' && config.sort && 'sorted',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function configsEqual(a: DrawConfig, b: DrawConfig): boolean {
  return (
    a.min === b.min &&
    a.max === b.max &&
    a.count === b.count &&
    a.allowRepeats === b.allowRepeats &&
    a.mode === b.mode &&
    a.sort === b.sort &&
    a.display === b.display
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Parses untrusted (stored) data into a valid config, or null. */
export function parseConfig(raw: unknown): DrawConfig | null {
  if (!isRecord(raw)) return null;
  const { min, max, count, allowRepeats, mode, sort, display } = raw;
  if (typeof min !== 'number' || typeof max !== 'number' || typeof count !== 'number') return null;
  if (typeof allowRepeats !== 'boolean' || typeof sort !== 'boolean') return null;
  if (!OUTPUT_MODES.includes(mode as OutputMode)) return null;

  const config: DrawConfig = {
    min,
    max,
    count,
    allowRepeats,
    mode: mode as OutputMode,
    sort,
    display: display === 'coin' ? 'coin' : 'number',
  };
  return isValidConfig(config) ? config : null;
}

/** Parses an untrusted (stored) history entry, or null. */
export function parseResult(raw: unknown): DrawResult | null {
  if (!isRecord(raw)) return null;
  const config = parseConfig(raw.config);
  const { id, timestamp, values } = raw;
  if (!config || typeof id !== 'string' || typeof timestamp !== 'number') return null;
  if (!Array.isArray(values) || values.length === 0 || !values.every(Number.isInteger)) return null;
  return { id, timestamp, config, values: values as number[] };
}
