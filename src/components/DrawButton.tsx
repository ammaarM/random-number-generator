import { motion } from 'framer-motion';
import { firstError, validateConfig } from '../lib/draw';
import { useStore } from '../store';
import { SparkleIcon } from './icons';

export function DrawButton() {
  const draw = useStore((s) => s.draw);
  const error = useStore((s) => firstError(validateConfig(s.config)));

  return (
    <div className="px-safe pb-safe shrink-0 pt-2">
      {error && (
        <p id="draw-error" className="pb-2 text-center text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <motion.button
        type="button"
        onClick={draw}
        disabled={Boolean(error)}
        aria-describedby={error ? 'draw-error' : undefined}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="flex h-[4.5rem] w-full select-none items-center justify-center gap-2 rounded-3xl bg-gradient-to-b from-accent to-accent-deep text-2xl font-extrabold tracking-wide text-on-accent shadow-glow disabled:opacity-50 disabled:shadow-none"
      >
        <SparkleIcon />
        Draw
      </motion.button>
    </div>
  );
}
