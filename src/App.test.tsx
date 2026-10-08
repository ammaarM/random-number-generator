import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { HISTORY_LIMIT, useStore } from './store';

const summary = () => screen.getByTestId('summary').textContent;
const liveRegion = () => within(screen.getByRole('region', { name: 'Result' })).getByRole('status');

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open settings' }));
  return screen.findByRole('dialog', { name: 'Settings' });
}

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('drawing', () => {
  it('shows the active config and draws a number in range', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(summary()).toBe('1 number · 1–6');

    await user.click(screen.getByRole('button', { name: 'Draw' }));

    const { values } = useStore.getState().result!;
    expect(values).toHaveLength(1);
    expect(values[0]).toBeGreaterThanOrEqual(1);
    expect(values[0]).toBeLessThanOrEqual(6);
    expect(liveRegion()).toHaveTextContent(`Result: ${values[0]}`);
    expect(screen.getByRole('button', { name: `Copy ${values[0]}` })).toBeInTheDocument();
  });

  it('applies a preset in one tap', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Lottery' }));
    expect(summary()).toBe('6 numbers · 1–59 · unique · sorted');
    expect(screen.getByRole('button', { name: 'Lottery' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Draw' }));
    const { values } = useStore.getState().result!;
    expect(new Set(values).size).toBe(6);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('shows the total and the individual values in sum mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Two 1–6 (sum)' }));
    await user.click(screen.getByRole('button', { name: 'Draw' }));

    const [a, b] = useStore.getState().result!.values;
    expect(screen.getByRole('button', { name: `Copy total ${a + b}` })).toBeInTheDocument();
    expect(screen.getByText(`${a} + ${b}`)).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent(`Total ${a + b}. Values: ${a}, ${b}`);
  });

  it('shows coin flips as Heads or Tails', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Coin flip' }));
    await user.click(screen.getByRole('button', { name: 'Draw' }));

    expect(liveRegion()).toHaveTextContent(/Result: (Heads|Tails)/);
  });

  it('copies a tapped result and confirms with a toast', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Draw' }));
    const value = String(useStore.getState().result!.values[0]);
    await user.click(screen.getByRole('button', { name: `Copy ${value}` }));

    expect(writeText).toHaveBeenCalledWith(value);
    expect(await screen.findByText(`Copied ${value}`)).toBeInTheDocument();
  });

  it('vibrates where supported', async () => {
    const user = userEvent.setup();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Draw' }));
    expect(vibrate).toHaveBeenCalled();
    Reflect.deleteProperty(navigator, 'vibrate');
  });
});

describe('settings', () => {
  it('edits the range and output mode from the sheet', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openSettings(user);

    const max = within(dialog).getByLabelText('Max');
    await user.clear(max);
    await user.type(max, '20');
    await user.click(within(dialog).getByRole('button', { name: 'Increase how many' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Sum' }));

    expect(summary()).toBe('2 numbers · 1–20 · sum');
    expect(within(dialog).queryByRole('switch', { name: /Sort results/ })).not.toBeInTheDocument();
  });

  it('accepts negative ranges', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openSettings(user);

    const min = within(dialog).getByLabelText('Min');
    await user.clear(min);
    await user.type(min, '-5');

    expect(summary()).toBe('1 number · −5 to 6');
    expect(screen.getByRole('button', { name: 'Draw' })).toBeEnabled();
  });

  it('blocks min greater than max', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openSettings(user);

    const min = within(dialog).getByLabelText('Min');
    await user.clear(min);
    await user.type(min, '9');

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Max must be at least the min');
    expect(within(dialog).getByLabelText('Max')).toBeInvalid();
    expect(screen.getByRole('button', { name: 'Draw' })).toBeDisabled();
  });

  it('blocks unique draws larger than the range with an inline message', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openSettings(user);

    const count = within(dialog).getByLabelText('How many');
    await user.clear(count);
    await user.type(count, '7');
    await user.click(within(dialog).getByRole('switch', { name: /Allow repeats/ }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Only 6 unique values in 1–6. Lower the count or allow repeats.',
    );
    expect(screen.getByRole('button', { name: 'Draw' })).toBeDisabled();
    expect(summary()).toBe('Check settings');

    await user.click(within(dialog).getByRole('switch', { name: /Allow repeats/ }));
    expect(screen.getByRole('button', { name: 'Draw' })).toBeEnabled();
  });

  it('closes with Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSettings(user);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
  });

  it('saves, applies and deletes a custom preset', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '1–20' }));
    const dialog = await openSettings(user);

    await user.type(within(dialog).getByLabelText('Save current settings as'), 'Initiative');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    const chip = screen.getByRole('button', { name: 'Initiative' });
    await user.click(screen.getByRole('button', { name: '1–6' }));
    await user.click(chip);
    expect(summary()).toBe('1 number · 1–20');
    expect(JSON.parse(window.localStorage.getItem('draw:presets')!)).toHaveLength(1);

    await user.click(within(dialog).getByRole('button', { name: 'Delete preset Initiative' }));
    expect(screen.queryByRole('button', { name: 'Initiative' })).not.toBeInTheDocument();
  });
});

describe('history', () => {
  it('records draws, expands, and clears', async () => {
    const user = userEvent.setup();
    render(<App />);
    const history = screen.getByRole('region', { name: 'History' });

    await user.click(screen.getByRole('button', { name: 'Draw' }));
    await user.click(screen.getByRole('button', { name: 'Draw' }));
    await user.click(within(history).getByRole('button', { name: /History/ }));

    expect(within(history).getAllByRole('listitem')).toHaveLength(2);
    expect(within(history).getAllByText(/1 number · 1–6/)).toHaveLength(2);

    await user.click(within(history).getByRole('button', { name: 'Clear' }));
    expect(within(history).getByText('No draws yet.')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('draw:history')!)).toEqual([]);
  });

  it('keeps only the most recent draws', () => {
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) useStore.getState().draw();
    expect(useStore.getState().history).toHaveLength(HISTORY_LIMIT);
    expect(useStore.getState().history[0]).toBe(useStore.getState().result);
  });
});

describe('theme and persistence', () => {
  it('defaults to dark and toggles to light', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement).toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(window.localStorage.getItem('draw:theme')).toBe('"light"');
  });

  it('persists the config', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '1–100' }));
    expect(JSON.parse(window.localStorage.getItem('draw:config')!)).toMatchObject({ max: 100 });
  });

  it('keeps working when storage is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: '1–20' }));
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    await user.click(screen.getByRole('button', { name: 'Draw' }));

    expect(useStore.getState().result).not.toBeNull();
    expect(liveRegion()).toHaveTextContent(/Result: \d+/);
  });
});
