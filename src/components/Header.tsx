import { summarize } from '../lib/draw';
import { useStore } from '../store';
import { MoonIcon, SlidersIcon, SparkleIcon, SunIcon } from './icons';

const iconButton =
  'grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text';

export function Header({ showSettingsButton }: { showSettingsButton: boolean }) {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const summary = useStore((s) => summarize(s.config));
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="px-safe flex flex-col gap-3 pb-2">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-deep text-on-accent">
            <SparkleIcon width={20} height={20} />
          </span>
          Draw
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            className={iconButton}
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} theme`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          {showSettingsButton && (
            <button
              type="button"
              className={iconButton}
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              aria-haspopup="dialog"
            >
              <SlidersIcon />
            </button>
          )}
        </div>
      </div>

      {showSettingsButton ? (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 text-left shadow-card"
        >
          <span className="sr-only">Drawing: </span>
          <span data-testid="summary" className="truncate text-sm font-semibold">
            {summary}
          </span>
          <span className="shrink-0 text-xs font-semibold text-accent-text">Edit</span>
        </button>
      ) : (
        <p className="text-sm font-semibold text-muted">
          <span className="sr-only">Drawing: </span>
          <span data-testid="summary">{summary}</span>
        </p>
      )}
    </header>
  );
}
