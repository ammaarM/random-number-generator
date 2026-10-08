import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useCopy } from '../hooks/useCopy';
import { resultDetail, resultText, summarize, type DrawResult } from '../lib/draw';
import { useStore } from '../store';
import { ChevronIcon, TrashIcon } from './icons';

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const time = timeFormat.format(date);
  return date.toDateString() === new Date().toDateString()
    ? time
    : `${dateFormat.format(date)}, ${time}`;
}

function HistoryRow({ entry }: { entry: DrawResult }) {
  const copy = useCopy();
  const detail = resultDetail(entry);
  return (
    <li>
      <button
        type="button"
        onClick={() => copy(resultText(entry))}
        aria-label={`Copy ${detail}`}
        className="flex min-h-11 w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left hover:bg-surface-2"
      >
        <span className="w-full truncate text-base font-bold tabular-nums">{detail}</span>
        <span className="w-full truncate text-xs text-muted">
          <time dateTime={new Date(entry.timestamp).toISOString()}>
            {formatTimestamp(entry.timestamp)}
          </time>
          {' · '}
          {summarize(entry.config)}
        </span>
      </button>
    </li>
  );
}

export function History() {
  const history = useStore((s) => s.history);
  const clearHistory = useStore((s) => s.clearHistory);
  const showToast = useStore((s) => s.showToast);
  const [open, setOpen] = useState(false);

  return (
    <section aria-label="History" className="px-safe shrink-0">
      <div className="rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="history-panel"
            className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl px-4 text-left text-sm font-semibold"
          >
            <ChevronIcon
              width={18}
              height={18}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
            History
            <span className="tabular-nums text-muted">{history.length}</span>
          </button>
          {open && history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearHistory();
                showToast('History cleared');
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-danger"
            >
              <TrashIcon width={16} height={16} />
              Clear
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="history-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {history.length === 0 ? (
                <p className="px-4 pb-4 pt-1 text-sm text-muted">No draws yet.</p>
              ) : (
                <ol className="max-h-[34dvh] overflow-y-auto px-1 pb-1">
                  {history.map((entry) => (
                    <HistoryRow key={entry.id} entry={entry} />
                  ))}
                </ol>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
