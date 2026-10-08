import { configsEqual } from '../lib/draw';
import { BUILT_IN_PRESETS } from '../lib/presets';
import { useStore } from '../store';

export function PresetChips() {
  const config = useStore((s) => s.config);
  const customPresets = useStore((s) => s.customPresets);
  const applyPreset = useStore((s) => s.applyPreset);
  const presets = [...BUILT_IN_PRESETS, ...customPresets];

  return (
    <div
      role="group"
      aria-label="Presets"
      className="no-scrollbar px-safe flex shrink-0 gap-2 overflow-x-auto py-2 lg:flex-wrap"
    >
      {presets.map((preset) => {
        const active = configsEqual(preset.config, config);
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            onClick={() => applyPreset(preset)}
            className={`h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
              active
                ? 'border-transparent bg-accent text-on-accent'
                : 'border-border bg-surface text-text hover:bg-surface-2'
            }`}
          >
            {preset.name}
          </button>
        );
      })}
    </div>
  );
}
