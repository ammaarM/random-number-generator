import { create } from 'zustand';
import {
  DEFAULT_CONFIG,
  isValidConfig,
  parseConfig,
  parseResult,
  performDraw,
  type DrawConfig,
  type DrawResult,
} from './lib/draw';
import { createId, vibrate } from './lib/platform';
import { MAX_CUSTOM_PRESETS, MAX_PRESET_NAME, parsePresets, type Preset } from './lib/presets';
import { loadJSON, saveJSON } from './lib/storage';

export type Theme = 'dark' | 'light';

export const HISTORY_LIMIT = 50;

interface Toast {
  id: number;
  message: string;
}

interface AppState {
  config: DrawConfig;
  customPresets: Preset[];
  history: DrawResult[];
  result: DrawResult | null;
  /** Draws this session; lets the live region re-announce identical results. */
  drawCount: number;
  theme: Theme;
  settingsOpen: boolean;
  toast: Toast | null;

  updateConfig: (patch: Partial<DrawConfig>) => void;
  applyPreset: (preset: Preset) => void;
  savePreset: (name: string) => boolean;
  deletePreset: (id: string) => void;
  draw: () => void;
  clearHistory: () => void;
  toggleTheme: () => void;
  setSettingsOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function loadTheme(): Theme {
  const stored = loadJSON('theme');
  return stored === 'light' || stored === 'dark' ? stored : systemTheme();
}

function loadHistory(): DrawResult[] {
  const raw = loadJSON('history');
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseResult)
    .filter((entry): entry is DrawResult => entry !== null)
    .slice(0, HISTORY_LIMIT);
}

/** Coin labels only make sense for 1–2, so drop them when the range moves. */
function normalize(config: DrawConfig): DrawConfig {
  return config.display === 'coin' && (config.min !== 1 || config.max !== 2)
    ? { ...config, display: 'number' }
    : config;
}

let toastId = 0;

export const useStore = create<AppState>()((set, get) => ({
  config: parseConfig(loadJSON('config')) ?? DEFAULT_CONFIG,
  customPresets: parsePresets(loadJSON('presets')),
  history: loadHistory(),
  result: null,
  drawCount: 0,
  theme: loadTheme(),
  settingsOpen: false,
  toast: null,

  updateConfig: (patch) => set({ config: normalize({ ...get().config, ...patch }) }),

  applyPreset: (preset) => set({ config: { ...preset.config } }),

  savePreset: (name) => {
    const { config, customPresets } = get();
    const trimmed = name.trim().slice(0, MAX_PRESET_NAME);
    if (!trimmed || !isValidConfig(config) || customPresets.length >= MAX_CUSTOM_PRESETS) {
      return false;
    }
    const preset: Preset = { id: createId(), name: trimmed, config: { ...config } };
    set({ customPresets: [...customPresets, preset] });
    return true;
  },

  deletePreset: (id) => set({ customPresets: get().customPresets.filter((p) => p.id !== id) }),

  draw: () => {
    const { config, history, drawCount } = get();
    if (!isValidConfig(config)) return;
    const result: DrawResult = {
      id: createId(),
      timestamp: Date.now(),
      config: { ...config },
      values: performDraw(config),
    };
    vibrate(12);
    set({
      result,
      drawCount: drawCount + 1,
      history: [result, ...history].slice(0, HISTORY_LIMIT),
    });
  },

  clearHistory: () => set({ history: [] }),

  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    // Only an explicit choice is stored; until then the system preference wins.
    saveJSON('theme', theme);
    set({ theme });
  },

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  showToast: (message) => set({ toast: { id: ++toastId, message } }),

  dismissToast: (id) => {
    if (get().toast?.id === id) set({ toast: null });
  },
}));

useStore.subscribe((state, previous) => {
  // Half-typed (invalid) configs are not worth restoring on the next visit.
  if (state.config !== previous.config && isValidConfig(state.config)) {
    saveJSON('config', state.config);
  }
  if (state.customPresets !== previous.customPresets) saveJSON('presets', state.customPresets);
  if (state.history !== previous.history) saveJSON('history', state.history);
});
