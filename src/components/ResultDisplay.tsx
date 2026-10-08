import { motion } from 'framer-motion';
import { useRef, useState, type MouseEvent } from 'react';
import { useCopy } from '../hooks/useCopy';
import { useRoll } from '../hooks/useRoll';
import {
  announceResult,
  formatValue,
  resultText,
  sumValues,
  usesCoinLabels,
  type DrawResult,
} from '../lib/draw';
import { vibrate } from '../lib/platform';
import { randomInt, randomInts } from '../lib/random';
import { useStore } from '../store';
import { CopyIcon } from './icons';

const ROLL_MS = 420;
const STAGGER_BUDGET_MS = 380;
/** Beyond this many tiles the ticking is skipped in favour of a quick stagger. */
const MAX_ROLLING_TILES = 30;
/** Two taps closer together than this count as a double-tap. */
const DOUBLE_TAP_MS = 350;

const settle = { scale: [1, 1.14, 1] };
const settleTransition = { duration: 0.32, ease: 'easeOut' as const };

function bigTextSize(length: number): string {
  if (length <= 2) return 'text-[9rem]';
  if (length <= 4) return 'text-8xl';
  if (length <= 6) return 'text-7xl';
  if (length <= 10) return 'text-5xl';
  if (length <= 24) return 'text-3xl';
  return 'text-xl';
}

function tileSize(count: number, length: number): { tile: string; text: string } {
  if (count <= 4) {
    return {
      tile: 'min-w-[5.5rem] rounded-3xl px-4 py-5',
      text: length <= 3 ? 'text-6xl' : length <= 6 ? 'text-4xl' : 'text-2xl',
    };
  }
  if (count <= 12) {
    return {
      tile: 'min-w-[4.25rem] rounded-2xl px-3 py-3.5',
      text: length <= 3 ? 'text-4xl' : length <= 6 ? 'text-2xl' : 'text-lg',
    };
  }
  return {
    tile: 'min-w-[3.25rem] rounded-xl px-2.5 py-2.5',
    text: length <= 3 ? 'text-2xl' : length <= 6 ? 'text-lg' : 'text-sm',
  };
}

interface RollingProps {
  final: string;
  sample: () => string;
  duration: number;
  onSettle?: () => void;
}

/** Text that ticks through random values, then pops as it settles. */
function Rolling({ final, sample, duration, onSettle }: RollingProps) {
  const { text, settled } = useRoll(final, sample, duration, onSettle);
  return (
    <motion.span
      aria-hidden="true"
      animate={settled ? settle : undefined}
      transition={settleTransition}
      className={`inline-block transition-colors duration-200 ${settled ? '' : 'text-muted'}`}
    >
      {text}
    </motion.span>
  );
}

function ListResult({ result }: { result: DrawResult }) {
  const { config, values } = result;
  const labels = values.map((v) => formatValue(v, config));
  const longest = Math.max(...labels.map((l) => l.length));
  const sample = () => formatValue(randomInt(config.min, config.max), config);
  const rolling = values.length <= MAX_ROLLING_TILES;
  const stagger = Math.min(70, STAGGER_BUDGET_MS / values.length);
  const onLastSettle = () => vibrate(18);

  if (values.length === 1) {
    return (
      <p
        className={`px-4 font-black tabular-nums leading-none tracking-tight ${bigTextSize(longest)}`}
      >
        <Rolling final={labels[0]} sample={sample} duration={ROLL_MS} onSettle={onLastSettle} />
      </p>
    );
  }

  const size = tileSize(values.length, longest);
  return (
    <ul className="flex flex-wrap justify-center gap-2.5">
      {labels.map((label, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, y: 14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: (i * stagger) / 1000, type: 'spring', stiffness: 420, damping: 26 }}
          className={`grid min-h-11 place-items-center border border-border bg-surface font-extrabold tabular-nums leading-none shadow-card ${size.tile} ${size.text} ${usesCoinLabels(config) ? '' : 'tracking-tight'}`}
        >
          <Rolling
            final={label}
            sample={sample}
            duration={rolling ? ROLL_MS + i * stagger : 0}
            onSettle={i === values.length - 1 ? onLastSettle : undefined}
          />
        </motion.li>
      ))}
    </ul>
  );
}

function SumResult({ result }: { result: DrawResult }) {
  const [settled, setSettled] = useState(false);
  const { config, values } = result;
  const total = resultText(result);
  const widest = Math.max(
    String(config.min * config.count).length,
    String(config.max * config.count).length,
  );
  const sample = () => String(sumValues(randomInts(config.min, config.max, config.count)));

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">Total</p>
      <p
        className={`px-4 font-black tabular-nums leading-none tracking-tight ${bigTextSize(widest)}`}
      >
        <Rolling
          final={total}
          sample={sample}
          duration={ROLL_MS + 120}
          onSettle={() => {
            setSettled(true);
            vibrate(18);
          }}
        />
      </p>
      <motion.p
        initial={false}
        animate={{ opacity: settled ? 1 : 0, y: settled ? 0 : 6 }}
        className="max-w-full break-words px-2 text-center text-lg font-semibold tabular-nums text-muted"
      >
        {values.join(' + ')}
      </motion.p>
    </div>
  );
}

function JoinedResult({ result }: { result: DrawResult }) {
  const { config } = result;
  const joined = resultText(result);
  const sample = () => randomInts(config.min, config.max, config.count).join('');

  return (
    <p
      className={`max-w-full break-all px-2 text-center font-black tabular-nums leading-tight tracking-tight ${bigTextSize(joined.length)}`}
    >
      <Rolling
        final={joined}
        sample={sample}
        duration={ROLL_MS + 120}
        onSettle={() => vibrate(18)}
      />
    </p>
  );
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p aria-hidden="true" className="text-[7rem] font-black leading-none text-muted/30">
        ?
      </p>
      <p className="text-base font-medium text-muted">Tap Draw to roll</p>
    </div>
  );
}

function Result({ result }: { result: DrawResult }) {
  switch (result.config.mode) {
    case 'sum':
      return <SumResult result={result} />;
    case 'joined':
      return <JoinedResult result={result} />;
    case 'list':
      return <ListResult result={result} />;
  }
}

/** Small corner badge that copies the whole result. */
function CopyBadge({ result }: { result: DrawResult }) {
  const copy = useCopy();
  const text = resultText(result);
  return (
    <button
      type="button"
      onClick={(event) => {
        // Keep badge taps out of the double-tap-to-draw detection.
        event.stopPropagation();
        copy(text);
      }}
      aria-label={`Copy ${text}`}
      className="group absolute right-[max(0.5rem,env(safe-area-inset-right))] top-0 z-10 grid h-11 w-11 place-items-center rounded-full"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted shadow-card transition-colors group-hover:text-text">
        <CopyIcon width={15} height={15} />
      </span>
    </button>
  );
}

export function ResultDisplay() {
  const result = useStore((s) => s.result);
  const drawCount = useStore((s) => s.drawCount);
  const draw = useStore((s) => s.draw);
  const lastTap = useRef(0);
  // A trailing no-break space on alternate draws makes identical results re-announce.
  const announcement = result ? announceResult(result) + (drawCount % 2 ? ' ' : '') : '';

  // Timed by hand rather than with `dblclick`, which touch browsers fire inconsistently.
  const onTap = (event: MouseEvent) => {
    if (event.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      draw();
    } else {
      lastTap.current = event.timeStamp;
    }
  };

  return (
    <section aria-label="Result" className="relative flex min-h-0 flex-1 flex-col">
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      {result && <CopyBadge result={result} />}
      {/* Double-tap is a pointer shortcut; the Draw button is the keyboard equivalent. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        onClick={onTap}
        className="px-safe flex min-h-0 flex-1 select-none overflow-y-auto overflow-x-hidden py-3"
      >
        <div className="m-auto flex max-w-full flex-col items-center gap-4">
          {result ? <Result key={result.id} result={result} /> : <Placeholder />}
          {result && <p className="text-xs font-medium text-muted">Double-tap to draw again</p>}
        </div>
      </div>
    </section>
  );
}
