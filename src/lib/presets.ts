import { DEFAULT_CONFIG, parseConfig, type DrawConfig } from './draw';

export interface Preset {
  id: string;
  name: string;
  config: DrawConfig;
}

export const MAX_PRESET_NAME = 24;
export const MAX_CUSTOM_PRESETS = 30;

const preset = (id: string, name: string, config: Partial<DrawConfig>): Preset => ({
  id: `builtin:${id}`,
  name,
  config: { ...DEFAULT_CONFIG, ...config },
});

export const BUILT_IN_PRESETS: readonly Preset[] = [
  preset('d6', '1–6', { max: 6 }),
  preset('d10', '1–10', { max: 10 }),
  preset('d20', '1–20', { max: 20 }),
  preset('d100', '1–100', { max: 100 }),
  preset('2d6', 'Two 1–6 (sum)', { max: 6, count: 2, mode: 'sum' }),
  preset('coin', 'Coin flip', { max: 2, display: 'coin' }),
];

/** Parses untrusted (stored) custom presets, dropping anything malformed. */
export function parsePresets(raw: unknown): Preset[] {
  if (!Array.isArray(raw)) return [];
  const presets: Preset[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, name, config } = item as Record<string, unknown>;
    const parsed = parseConfig(config);
    if (typeof id === 'string' && typeof name === 'string' && name.trim() && parsed) {
      presets.push({ id, name: name.trim().slice(0, MAX_PRESET_NAME), config: parsed });
    }
  }
  return presets.slice(0, MAX_CUSTOM_PRESETS);
}
