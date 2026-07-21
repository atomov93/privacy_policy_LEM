import Clipboard from '@react-native-clipboard/clipboard';

import {CLIPBOARD_CLEAR_MS} from './limits';

let clearTimer: ReturnType<typeof setTimeout> | null = null;
let clearToken = 0;
let lastCopied: string | null = null;

/**
 * Copy sensitive text and schedule an automatic clipboard clear.
 * Best-effort: other apps may still have read the value before expiry.
 */
export async function copySensitiveText(
  text: string,
  clearAfterMs: number = CLIPBOARD_CLEAR_MS,
): Promise<void> {
  if (!text) {
    return;
  }

  Clipboard.setString(text);
  lastCopied = text;
  if (clearTimer) {
    clearTimeout(clearTimer);
  }
  const token = ++clearToken;
  clearTimer = setTimeout(() => {
    if (token !== clearToken) {
      return;
    }
    if (lastCopied === text) {
      Clipboard.setString('');
      lastCopied = null;
    }
  }, clearAfterMs);
}

/** Test helper to cancel pending clipboard clears. */
export function cancelClipboardClear(): void {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  clearToken += 1;
}
