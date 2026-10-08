import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  announceResult,
  formatValue,
  parseConfig,
  parseResult,
  performDraw,
  resultDetail,
  resultText,
  summarize,
  validateConfig,
  type DrawConfig,
} from './draw';
import { BUILT_IN_PRESETS, parsePresets } from './presets';

const config = (patch: Partial<DrawConfig> = {}): DrawConfig => ({ ...DEFAULT_CONFIG, ...patch });

describe('validateConfig', () => {
  it('accepts the default config and every built-in preset', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toEqual({});
    for (const preset of BUILT_IN_PRESETS) expect(validateConfig(preset.config)).toEqual({});
  });

  it('requires min ≤ max', () => {
    expect(validateConfig(config({ min: 7, max: 3 })).max).toMatch(/at least the min/);
    expect(validateConfig(config({ min: 3, max: 3 }))).toEqual({});
  });

  it('accepts negative ranges', () => {
    expect(validateConfig(config({ min: -10, max: -2 }))).toEqual({});
  });

  it('rejects non-integers and out-of-limit values', () => {
    expect(validateConfig(config({ min: Number.NaN })).min).toBeDefined();
    expect(validateConfig(config({ max: 2.5 })).max).toBeDefined();
    expect(validateConfig(config({ max: 1e12 })).max).toBeDefined();
  });

  it('limits count to 1–100', () => {
    expect(validateConfig(config({ count: 0 })).count).toBeDefined();
    expect(validateConfig(config({ count: 101 })).count).toBeDefined();
    expect(validateConfig(config({ count: Number.NaN })).count).toBeDefined();
    expect(validateConfig(config({ count: 100 }))).toEqual({});
  });

  it('blocks unique draws larger than the range, with a clear message', () => {
    const errors = validateConfig(config({ count: 7, allowRepeats: false }));
    expect(errors.count).toBe('Only 6 unique values in 1–6. Lower the count or allow repeats.');
    expect(validateConfig(config({ count: 6, allowRepeats: false }))).toEqual({});
    expect(validateConfig(config({ count: 7, allowRepeats: true }))).toEqual({});
  });
});

describe('performDraw', () => {
  it('draws the requested count within bounds', () => {
    const values = performDraw(config({ min: -3, max: 3, count: 50 }));
    expect(values).toHaveLength(50);
    expect(values.every((v) => v >= -3 && v <= 3)).toBe(true);
  });

  it('draws unique values when repeats are off', () => {
    const values = performDraw(config({ max: 59, count: 6, allowRepeats: false }));
    expect(new Set(values).size).toBe(6);
  });

  it('sorts only in list mode', () => {
    const sorted = performDraw(config({ max: 20, count: 20, allowRepeats: false, sort: true }));
    expect(sorted).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));

    // Deterministic source: values arrive as 6, 1, 3 and must stay in that order for sum mode.
    const stream = [5, 0, 2];
    let i = 0;
    const values = performDraw(config({ count: 3, sort: true, mode: 'sum' }), () => stream[i++]);
    expect(values).toEqual([6, 1, 3]);
  });

  it('throws for an invalid config', () => {
    expect(() => performDraw(config({ min: 5, max: 1 }))).toThrow(RangeError);
    expect(() => performDraw(config({ count: 7, allowRepeats: false }))).toThrow(RangeError);
  });
});

describe('formatting', () => {
  it('formats list, sum and joined results', () => {
    expect(resultText({ config: config({ count: 3 }), values: [4, 2, 6] })).toBe('4, 2, 6');
    expect(resultText({ config: config({ count: 3, mode: 'sum' }), values: [4, 2, 6] })).toBe('12');
    expect(resultText({ config: config({ count: 3, mode: 'joined' }), values: [4, 2, 6] })).toBe(
      '426',
    );
  });

  it('adds the working to sum results', () => {
    const result = { config: config({ count: 2, mode: 'sum' }), values: [4, 2] };
    expect(resultDetail(result)).toBe('6 (4 + 2)');
    expect(announceResult(result)).toBe('Total 6. Values: 4, 2');
  });

  it('shows coin flips as Heads/Tails', () => {
    const coin = config({ max: 2, display: 'coin' });
    expect(formatValue(1, coin)).toBe('Heads');
    expect(formatValue(2, coin)).toBe('Tails');
    expect(announceResult({ config: coin, values: [2] })).toBe('Result: Tails');
    // Coin labels need a 1–2 list.
    expect(formatValue(1, config({ max: 6, display: 'coin' }))).toBe('1');
  });

  it('summarises the active config', () => {
    expect(summarize(config())).toBe('1 number · 1–6');
    expect(summarize(config({ count: 3, mode: 'sum' }))).toBe('3 numbers · 1–6 · sum');
    expect(summarize(config({ max: 59, count: 6, allowRepeats: false, sort: true }))).toBe(
      '6 numbers · 1–59 · unique · sorted',
    );
    expect(summarize(config({ min: -5, max: 5 }))).toBe('1 number · −5 to 5');
    expect(summarize(config({ max: 2, display: 'coin' }))).toBe('Coin flip');
    expect(summarize(config({ min: 9, max: 1 }))).toBe('Check settings');
  });
});

describe('parsing stored data', () => {
  it('round-trips a valid config through JSON', () => {
    const unique = config({ max: 59, count: 6, allowRepeats: false, sort: true });
    expect(parseConfig(JSON.parse(JSON.stringify(unique)))).toEqual(unique);
  });

  it('rejects malformed or invalid configs', () => {
    expect(parseConfig(null)).toBeNull();
    expect(parseConfig('nope')).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, mode: 'average' })).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, min: null })).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, min: 10, max: 1 })).toBeNull();
  });

  it('rejects malformed history entries and presets', () => {
    const entry = { id: 'a', timestamp: 1, config: DEFAULT_CONFIG, values: [3] };
    expect(parseResult(entry)).toEqual(entry);
    expect(parseResult({ ...entry, values: ['3'] })).toBeNull();
    expect(parseResult({ ...entry, config: {} })).toBeNull();
    expect(
      parsePresets([{ id: 'x', name: ' Mine ', config: DEFAULT_CONFIG }, { id: 'y' }, 4]),
    ).toEqual([{ id: 'x', name: 'Mine', config: DEFAULT_CONFIG }]);
    expect(parsePresets({})).toEqual([]);
  });
});
