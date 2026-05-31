import { useCallback, useEffect, useRef, useState } from "react";

type CopyableValue = string | number | null | undefined;

type UseCopyToClipboardOptions = {
  /** How long the `copied` flag stays true after a successful copy. */
  resetDelayMs?: number;
};

/**
 * Copy text to the clipboard and expose a transient `copied` flag for
 * confirmation UI (e.g. swapping a Copy icon for a Check). Each instance owns
 * its own state, so it is safe to call once per copyable row/card.
 */
export function useCopyToClipboard({
  resetDelayMs = 1500,
}: UseCopyToClipboardOptions = {}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearPendingReset = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingReset, [clearPendingReset]);

  const copy = useCallback(
    async (value: CopyableValue) => {
      const text = String(value ?? "").trim();
      if (!text || !navigator.clipboard) return false;

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }

      clearPendingReset();
      setCopied(true);
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, resetDelayMs);
      return true;
    },
    [clearPendingReset, resetDelayMs]
  );

  return { copied, copy };
}
