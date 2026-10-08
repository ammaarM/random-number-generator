import { describe, expect, it, vi } from 'vitest';
import {
  SMALL_RANGE,
  randomBelow,
  randomInt,
  randomInts,
  rangeSize,
  uniqueRandomInts,
  type RandomSource,
} from './random';

/** A source that replays a fixed list of uint32 values. */
function sequence(values: number[]): RandomSource & { calls: () => number } {
  let i = 0;
  const source = () => {
    if (i >= values.length) throw new Error('sequence exhausted');
    return values[i++];
  };
  return Object.assign(source, { calls: () => i });
}

/** Pearson chi-square statistic against a uniform expectation. */
function chiSquare(counts: number[], total: number): number {
  const expected = total / counts.length;
  return counts.reduce((sum, n) => sum + (n - expected) ** 2 / expected, 0);
}

describe('randomBelow', () => {
  it('returns 0 for n = 1 without consuming randomness', () => {
    const source = sequence([]);
    expect(randomBelow(1, source)).toBe(0);
    expect(source.calls()).toBe(0);
  });

  it('rejects values above the largest multiple of n (no modulo bias)', () => {
    // 2^32 % 3 === 1, so only 0xFFFFFFFF falls in the biased tail.
    const source = sequence([0xffffffff, 0xffffffff, 5]);
    expect(randomBelow(3, source)).toBe(2);
    expect(source.calls()).toBe(3);
  });

  it('accepts the last value below the rejection limit', () => {
    expect(randomBelow(3, sequence([0xfffffffe]))).toBe(2);
  });

  it('never rejects when n divides 2^32', () => {
    const source = sequence([0xffffffff]);
    expect(randomBelow(2 ** 32, source)).toBe(0xffffffff);
    expect(randomBelow(256, sequence([0xffffffff]))).toBe(255);
  });

  it('combines two draws for ranges wider than 32 bits', () => {
    const source = sequence([0xffffffff, 0xffffffff]);
    expect(randomBelow(2 ** 33, source)).toBe(2 ** 33 - 1);
    expect(source.calls()).toBe(2);
  });

  it('throws for invalid n', () => {
    for (const n of [0, -1, 1.5, Number.NaN, Infinity, 2 ** 53]) {
      expect(() => randomBelow(n)).toThrow(RangeError);
    }
  });
});

describe('randomInt', () => {
  it('stays within inclusive bounds and reaches both ends', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(1, 6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('returns the only value when min = max', () => {
    expect(randomInt(7, 7)).toBe(7);
    expect(randomInt(-3, -3)).toBe(-3);
    expect(randomInt(0, 0)).toBe(0);
  });

  it('handles negative and zero-crossing ranges', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(-5, 5);
      expect(n).toBeGreaterThanOrEqual(-5);
      expect(n).toBeLessThanOrEqual(5);
      seen.add(n);
    }
    expect(seen.size).toBe(11);
    for (let i = 0; i < 200; i++) {
      const n = randomInt(-20, -10);
      expect(n).toBeGreaterThanOrEqual(-20);
      expect(n).toBeLessThanOrEqual(-10);
    }
  });

  it('handles ranges wider than 32 bits', () => {
    const min = -(2 ** 40);
    const max = 2 ** 40;
    for (let i = 0; i < 500; i++) {
      const n = randomInt(min, max);
      expect(Number.isSafeInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(min);
      expect(n).toBeLessThanOrEqual(max);
    }
  });

  it('maps the source value onto the range', () => {
    expect(randomInt(10, 15, sequence([0]))).toBe(10);
    expect(randomInt(10, 15, sequence([5]))).toBe(15);
    expect(randomInt(-2, 2, sequence([7]))).toBe(0);
  });

  it('throws for invalid bounds', () => {
    expect(() => randomInt(5, 1)).toThrow(RangeError);
    expect(() => randomInt(1.5, 3)).toThrow(RangeError);
    expect(() => randomInt(1, Number.NaN)).toThrow(RangeError);
    expect(() => randomInt(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });

  it('is roughly uniform over many samples', () => {
    const total = 60_000;
    const counts = new Array<number>(6).fill(0);
    for (let i = 0; i < total; i++) counts[randomInt(1, 6) - 1]++;
    // df = 5; 30 corresponds to p ≈ 1e-5, so false failures are vanishingly rare.
    expect(chiSquare(counts, total)).toBeLessThan(30);
  });

  it('is roughly uniform for a range that does not divide 2^32', () => {
    const total = 70_000;
    const counts = new Array<number>(7).fill(0);
    for (let i = 0; i < total; i++) counts[randomInt(-3, 3) + 3]++;
    // df = 6; 33 corresponds to p ≈ 1e-5.
    expect(chiSquare(counts, total)).toBeLessThan(33);
  });
});

describe('randomInts', () => {
  it('returns the requested number of in-range values', () => {
    const values = randomInts(1, 20, 100);
    expect(values).toHaveLength(100);
    expect(values.every((n) => n >= 1 && n <= 20)).toBe(true);
  });

  it('allows repeats', () => {
    expect(randomInts(4, 4, 5)).toEqual([4, 4, 4, 4, 4]);
    expect(new Set(randomInts(1, 2, 50)).size).toBeLessThanOrEqual(2);
  });

  it('returns an empty array for count = 0 and rejects bad counts', () => {
    expect(randomInts(1, 6, 0)).toEqual([]);
    expect(() => randomInts(1, 6, -1)).toThrow(RangeError);
    expect(() => randomInts(1, 6, 2.5)).toThrow(RangeError);
  });
});

describe('uniqueRandomInts', () => {
  const expectUniqueInRange = (values: number[], min: number, max: number, count: number) => {
    expect(values).toHaveLength(count);
    expect(new Set(values).size).toBe(count);
    expect(values.every((n) => Number.isInteger(n) && n >= min && n <= max)).toBe(true);
  };

  it('returns distinct values from a small range (shuffle path)', () => {
    for (let i = 0; i < 200; i++) expectUniqueInRange(uniqueRandomInts(1, 59, 6), 1, 59, 6);
  });

  it('returns a full permutation when count equals the range size', () => {
    const values = uniqueRandomInts(-3, 3, 7);
    expect([...values].sort((a, b) => a - b)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(uniqueRandomInts(9, 9, 1)).toEqual([9]);
  });

  it('returns distinct values for a sparse draw from a huge range (Set path)', () => {
    const min = -999_999_999;
    const max = 999_999_999;
    for (let i = 0; i < 20; i++)
      expectUniqueInRange(uniqueRandomInts(min, max, 100), min, max, 100);
  });

  it('returns distinct values just past the small-range threshold', () => {
    const max = SMALL_RANGE * 2;
    expectUniqueInRange(uniqueRandomInts(1, max, 100), 1, max, 100); // Set path
    expectUniqueInRange(uniqueRandomInts(1, max, max - 10), 1, max, max - 10); // shuffle path
  });

  it('retries on collisions in the Set path', () => {
    const size = SMALL_RANGE * 4;
    const source = sequence([3, 3, 3, 8]);
    expect(uniqueRandomInts(0, size - 1, 2, source)).toEqual([3, 8]);
    expect(source.calls()).toBe(4);
  });

  it('performs a partial Fisher–Yates shuffle', () => {
    // i=0: j = 0 + 2 → [3,2,1,4,5]; i=1: j = 1 + 3 → [3,5,1,4,2]
    expect(uniqueRandomInts(1, 5, 2, sequence([2, 3]))).toEqual([3, 5]);
  });

  it('returns an empty array for count = 0', () => {
    expect(uniqueRandomInts(1, 6, 0)).toEqual([]);
  });

  it('throws when count exceeds the range size', () => {
    expect(() => uniqueRandomInts(1, 6, 7)).toThrow(RangeError);
    expect(() => uniqueRandomInts(5, 5, 2)).toThrow(RangeError);
    expect(() => uniqueRandomInts(6, 1, 1)).toThrow(RangeError);
  });

  it('includes every value equally often and orders them uniformly', () => {
    const rounds = 20_000;
    const included = new Array<number>(5).fill(0);
    const first = new Array<number>(5).fill(0);
    for (let i = 0; i < rounds; i++) {
      const values = uniqueRandomInts(1, 5, 3);
      first[values[0] - 1]++;
      for (const n of values) included[n - 1]++;
    }
    // df = 4; 28 corresponds to p ≈ 1e-5.
    expect(chiSquare(first, rounds)).toBeLessThan(28);
    for (const n of included) expect(n / rounds).toBeCloseTo(3 / 5, 1);
  });
});

describe('rangeSize', () => {
  it('counts inclusive bounds', () => {
    expect(rangeSize(1, 6)).toBe(6);
    expect(rangeSize(-5, 5)).toBe(11);
    expect(rangeSize(3, 3)).toBe(1);
  });
});

describe('entropy source', () => {
  it('uses crypto.getRandomValues and never Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random');
    const getRandomValues = vi.spyOn(crypto, 'getRandomValues');
    // More draws than the internal buffer holds, so a refill is guaranteed.
    randomInts(1, 100, 200);
    uniqueRandomInts(1, 59, 6);
    uniqueRandomInts(1, 1_000_000, 50);
    expect(getRandomValues).toHaveBeenCalled();
    expect(mathRandom).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
