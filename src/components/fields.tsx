import { useEffect, useId, useState, type ReactNode } from 'react';
import { MinusIcon, PlusIcon } from './icons';

const parseInteger = (text: string) => (/^-?\d+$/.test(text.trim()) ? Number(text) : Number.NaN);
const sameNumber = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b));

interface NumberFieldProps {
  label: string;
  /** NaN means "not a whole number yet"; the caller validates. */
  value: number;
  onChange: (value: number) => void;
  error?: string;
  /** Shows − / + buttons that step within these bounds. */
  stepper?: { min: number; max: number };
}

export function NumberField({ label, value, onChange, error, stepper }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(Number.isNaN(value) ? '' : String(value));

  // Follow outside changes (presets, steppers) without clobbering half-typed input.
  useEffect(() => {
    setText((current) =>
      sameNumber(parseInteger(current), value) ? current : Number.isNaN(value) ? '' : String(value),
    );
  }, [value]);

  const step = (delta: number) => {
    if (!stepper) return;
    const base = Number.isNaN(value) ? stepper.min - delta : value;
    onChange(Math.min(stepper.max, Math.max(stepper.min, base + delta)));
  };

  const stepButton =
    'grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 text-text disabled:opacity-40';

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-muted">
        {label}
      </label>
      <div className="flex gap-2">
        {stepper && (
          <button
            type="button"
            className={stepButton}
            onClick={() => step(-1)}
            disabled={value <= stepper.min}
            aria-label={`Decrease ${label.toLowerCase()}`}
          >
            <MinusIcon width={20} height={20} />
          </button>
        )}
        <input
          id={id}
          type="number"
          step={1}
          inputMode={stepper && stepper.min >= 0 ? 'numeric' : undefined}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onChange(parseInteger(event.target.value));
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full min-w-0 rounded-xl border bg-surface-2 px-3 text-lg font-bold tabular-nums text-text ${
            stepper ? 'text-center' : ''
          } ${error ? 'border-danger' : 'border-border'}`}
        />
        {stepper && (
          <button
            type="button"
            className={stepButton}
            onClick={() => step(1)}
            disabled={value >= stepper.max}
            aria-label={`Increase ${label.toLowerCase()}`}
          >
            <PlusIcon width={20} height={20} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl py-1 text-left"
    >
      <span className="flex flex-col">
        <span className="text-base font-semibold">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`flex h-8 w-14 shrink-0 items-center rounded-full border p-0.5 transition-colors ${
          checked ? 'justify-end border-transparent bg-accent' : 'border-border bg-surface-2'
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full shadow transition-colors ${checked ? 'bg-on-accent' : 'bg-muted'}`}
        />
      </span>
    </button>
  );
}

interface SegmentedProps<T extends string> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1.5 text-sm font-semibold text-muted">{legend}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl border border-border bg-surface-2 p-1">
        {options.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="grid min-h-11 place-items-center rounded-xl px-2 text-sm font-semibold text-muted transition-colors peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{title}</h3>
      {children}
    </section>
  );
}
