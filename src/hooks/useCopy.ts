import { useCallback } from 'react';
import { copyText, vibrate } from '../lib/platform';
import { useStore } from '../store';

/** Copies text to the clipboard and confirms with a toast. */
export function useCopy(): (text: string) => void {
  const showToast = useStore((s) => s.showToast);
  return useCallback(
    (text: string) => {
      void copyText(text).then((ok) => {
        if (ok) vibrate(8);
        const shown = text.length > 24 ? `${text.slice(0, 24)}…` : text;
        showToast(ok ? `Copied ${shown}` : 'Couldn’t copy on this device');
      });
    },
    [showToast],
  );
}
