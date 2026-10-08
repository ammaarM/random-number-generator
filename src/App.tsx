import { MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { BottomSheet } from './components/BottomSheet';
import { DrawButton } from './components/DrawButton';
import { Header } from './components/Header';
import { History } from './components/History';
import { PresetChips } from './components/PresetChips';
import { ResultDisplay } from './components/ResultDisplay';
import { SettingsForm } from './components/SettingsForm';
import { Toast } from './components/Toast';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useStore } from './store';

const THEME_COLORS = { dark: '#0c0b16', light: '#f5f4fb' } as const;

export default function App() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const theme = useStore((s) => s.theme);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex h-dvh w-full max-w-md md:max-w-xl lg:max-w-5xl lg:gap-6 lg:px-6">
        <main className="pt-safe flex min-h-0 min-w-0 flex-1 flex-col">
          <Header showSettingsButton={!isDesktop} />
          <PresetChips />
          <ResultDisplay />
          <History />
          <DrawButton />
        </main>

        {isDesktop && (
          <aside aria-label="Settings" className="flex w-[24rem] shrink-0 flex-col py-6">
            <div className="min-h-0 overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-card">
              <h2 className="pb-5 text-xl font-extrabold">Settings</h2>
              <SettingsForm />
            </div>
          </aside>
        )}
      </div>

      {!isDesktop && (
        <BottomSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
          <SettingsForm />
        </BottomSheet>
      )}
      <Toast />
    </MotionConfig>
  );
}
