/**
 * Cryptographically secure, unbiased random integers.
 *
 * Pure and framework-free. Every function takes an optional `source` so tests
 * can feed in a deterministic stream; production code uses `cryptoSource`.
 */

/** Returns a uniformly distributed unsigned 32-bit integer. */
export type RandomSource = () => number;

const UINT32_RANGE = 0x1_0000_0000; // 2^32
const UINT53_RANGE = Number.MAX_SAFE_INTEGER + 1; // 2^53

/** Ranges up to this size are always drawn with a partial Fisher–Yates shuffle. */
export const SMALL_RANGE = 4096;

const pool = new Uint32Array(64);
let poolIndex = pool.length;

/** Default source: `crypto.getRandomValues`, read through a small buffer. */
export const cryptoSource: RandomSource = () => {
  if (poolIndex >= pool.length) {
    crypto.getRandomValues(pool);
    poolIndex = 0;
  }
  return pool[poolIndex++];
};

/**
 * Uniform integer in `[0, n)` for `1 ≤ n ≤ 2^53 − 1`.
 *
 * Uses rejection sampling: raw values at or above the largest multiple of `n`
 * are discarded, so `x % n` carries no modulo bias.
 */
export function randomBelow(n: number, source: RandomSource = cryptoSource): number {
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new RangeError(`n must be a positive safe integer, received ${n}`);
  }
  if (n === 1) return 0;

  if (n <= UINT32_RANGE) {
    const limit = UINT32_RANGE - (UINT32_RANGE % n);
    let x = source();
    while (x >= limit) x = source();
    return x % n;
  }

  // Wider than 32 bits: build a 53-bit value from two draws (21 + 32 bits).
  const limit = UINT53_RANGE - (UINT53_RANGE % n);
  const next = () => (source() >>> 11) * UINT32_RANGE + source();
  let x = next();
  while (x >= limit) x = next();
  return x % n;
}

/** Number of integers in the inclusive range `[min, max]`, validating the bounds. */
export function rangeSize(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new RangeError('min and max must be safe integers');
  }
  if (min > max) {
    throw new RangeError(`min (${min}) must not be greater than max (${max})`);
  }
  const size = max - min + 1;
  if (!Number.isSafeInteger(size)) {
    throw new RangeError('range is too large');
  }
  return size;
}

function assertCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(`count must be a non-negative integer, received ${count}`);
  }
}

/** Uniform integer in the inclusive range `[min, max]`. */
export function randomInt(min: number, max: number, source: RandomSource = cryptoSource): number {
  return min + randomBelow(rangeSize(min, max), source);
}

/** `count` independent integers in `[min, max]`; repeats are possible. */
export function randomInts(
  min: number,
  max: number,
  count: number,
  source: RandomSource = cryptoSource,
): number[] {
  assertCount(count);
  const size = rangeSize(min, max);
  return Array.from({ length: count }, () => min + randomBelow(size, source));
}

/**
 * `count` distinct integers in `[min, max]`, in uniformly random order.
 *
 * - Small ranges, or draws that take more than half the range, use a partial
 *   Fisher–Yates shuffle over the whole range.
 * - Sparse draws from a large range use rejection against a Set, which needs
 *   memory proportional to `count` rather than to the range.
 */
export function uniqueRandomInts(
  min: number,
  max: number,
  count: number,
  source: RandomSource = cryptoSource,
): number[] {
  assertCount(count);
  const size = rangeSize(min, max);
  if (count > size) {
    throw new RangeError(`cannot draw ${count} unique values from a range of ${size}`);
  }

  if (size <= SMALL_RANGE || count * 2 > size) {
    const values = Array.from({ length: size }, (_, i) => min + i);
    for (let i = 0; i < count; i++) {
      const j = i + randomBelow(size - i, source);
      [values[i], values[j]] = [values[j], values[i]];
    }
    values.length = count;
    return values;
  }

  const seen = new Set<number>();
  while (seen.size < count) {
    seen.add(min + randomBelow(size, source));
  }
  return [...seen];
}
