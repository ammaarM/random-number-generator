import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const TICK_MS = 55;

interface Roll {
  text: string;
  settled: boolean;
}

/**
 * Ticks through `sample()` values for `duration` ms, then settles on `final`.
 * Settles immediately when the user prefers reduced motion or `duration` is 0.
 * Mount a fresh instance (via `key`) for each new roll.
 */
export function useRoll(
  final: string,
  sample: () => string,
  duration: number,
  onSettle?: () => void,
): Roll {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion && duration > 0;
  const [roll, setRoll] = useState<Roll>(() => ({
    text: animate ? sample() : final,
    settled: !animate,
  }));

  const sampleRef = useRef(sample);
  const onSettleRef = useRef(onSettle);
  useEffect(() => {
    sampleRef.current = sample;
    onSettleRef.current = onSettle;
  });

  useEffect(() => {
    if (!animate) {
      setRoll({ text: final, settled: true });
      onSettleRef.current?.();
      return;
    }
    const tick = window.setInterval(
      () => setRoll({ text: sampleRef.current(), settled: false }),
      TICK_MS,
    );
    const done = window.setTimeout(() => {
      window.clearInterval(tick);
      setRoll({ text: final, settled: true });
      onSettleRef.current?.();
    }, duration);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [animate, final, duration]);

  return roll;
}
