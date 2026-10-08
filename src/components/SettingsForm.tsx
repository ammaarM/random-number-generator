import { useState, type FormEvent } from 'react';
import { LIMITS, isValidConfig, summarize, validateConfig, type OutputMode } from '../lib/draw';
import { MAX_CUSTOM_PRESETS, MAX_PRESET_NAME } from '../lib/presets';
import { useStore } from '../store';
import { NumberField, Section, Segmented, Toggle } from './fields';
import { TrashIcon } from './icons';

const MODES: readonly { value: OutputMode; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'sum', label: 'Sum' },
  { value: 'joined', label: 'Joined' },
];

const MODE_HINTS: Record<OutputMode, string> = {
  list: 'Each number gets its own tile.',
  sum: 'Numbers are added into one total.',
  joined: 'Digits are joined into one code, handy for PINs.',
};

function SavePreset() {
  const customPresets = useStore((s) => s.customPresets);
  const canSave = useStore((s) => isValidConfig(s.config));
  const savePreset = useStore((s) => s.savePreset);
  const deletePreset = useStore((s) => s.deletePreset);
  const showToast = useStore((s) => s.showToast);
  const [name, setName] = useState('');
  const full = customPresets.length >= MAX_CUSTOM_PRESETS;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (savePreset(name)) {
      showToast(`Saved “${name.trim()}”`);
      setName('');
    }
  };

  return (
    <Section title="Your presets">
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="preset-name" className="text-sm font-semibold text-muted">
            Save current settings as
          </label>
          <input
            id="preset-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_PRESET_NAME}
            placeholder="e.g. Initiative"
            autoComplete="off"
            enterKeyHint="done"
            className="h-12 w-full min-w-0 rounded-xl border border-border bg-surface-2 px-3 text-base font-semibold text-text placeholder:font-normal placeholder:text-muted"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim() || !canSave || full}
          className="h-12 shrink-0 rounded-xl bg-accent px-5 text-base font-bold text-on-accent disabled:opacity-40"
        >
          Save
        </button>
      </form>
      {full && <p className="text-sm text-muted">Preset limit reached. Remove one to add more.</p>}
      {customPresets.length > 0 && (
        <ul className="flex flex-col gap-1">
          {customPresets.map((preset) => (
            <li
              key={preset.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 pl-3"
            >
              <span className="flex min-w-0 flex-1 flex-col py-1.5">
                <span className="truncate text-sm font-semibold">{preset.name}</span>
                <span className="truncate text-xs text-muted">{summarize(preset.config)}</span>
              </span>
              <button
                type="button"
                onClick={() => deletePreset(preset.id)}
                aria-label={`Delete preset ${preset.name}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-danger"
              >
                <TrashIcon width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function SettingsForm() {
  const config = useStore((s) => s.config);
  const updateConfig = useStore((s) => s.updateConfig);
  const errors = validateConfig(config);

  return (
    <div className="flex flex-col gap-7">
      <Section title="Range">
        <div className="flex gap-3">
          <NumberField
            label="Min"
            value={config.min}
            onChange={(min) => updateConfig({ min })}
            error={errors.min}
          />
          <NumberField
            label="Max"
            value={config.max}
            onChange={(max) => updateConfig({ max })}
            error={errors.max}
          />
        </div>
      </Section>

      <Section title="Numbers">
        <NumberField
          label="How many"
          value={config.count}
          onChange={(count) => updateConfig({ count })}
          error={errors.count}
          stepper={{ min: LIMITS.minCount, max: LIMITS.maxCount }}
        />
        <Toggle
          label="Allow repeats"
          hint={
            config.allowRepeats ? 'The same number can come up twice.' : 'Every number is unique.'
          }
          checked={config.allowRepeats}
          onChange={(allowRepeats) => updateConfig({ allowRepeats })}
        />
      </Section>

      <Section title="Output">
        <Segmented
          legend="Show results as"
          value={config.mode}
          options={MODES}
          onChange={(mode) => updateConfig({ mode })}
        />
        <p className="text-sm text-muted">{MODE_HINTS[config.mode]}</p>
        {config.mode === 'list' && (
          <Toggle
            label="Sort results"
            hint="Lowest to highest."
            checked={config.sort}
            onChange={(sort) => updateConfig({ sort })}
          />
        )}
      </Section>

      <SavePreset />
    </div>
  );
}
