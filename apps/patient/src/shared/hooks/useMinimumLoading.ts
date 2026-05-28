import { useEffect, useRef, useState } from "react";

/**
 * Return ``true`` while a loading screen should be visible.
 *
 * Behaviour mirrors the clinician app's hook:
 * - Waits ``delayMs`` (default 150ms) before flipping ``true`` so very
 *   fast loads don't flash a loading screen at all.
 * - Once shown, stays ``true`` for at least ``minimumMs`` (default
 *   300ms) so the loading screen doesn't flicker out the instant data
 *   arrives.
 */
const DEFAULT_MINIMUM_LOADING_MS = 300;
const DEFAULT_DELAY_MS = 150;

export default function useMinimumLoading(
  isLoading: boolean,
  minimumMs = DEFAULT_MINIMUM_LOADING_MS,
  delayMs = DEFAULT_DELAY_MS
): boolean {
  const [shouldShowLoading, setShouldShowLoading] = useState(false);
  const startedAtRef = useRef(0);
  const delayTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (shouldShowLoading) return undefined;

      if (delayMs > 0) {
        if (!delayTimeoutRef.current) {
          delayTimeoutRef.current = window.setTimeout(() => {
            startedAtRef.current = performance.now();
            setShouldShowLoading(true);
            delayTimeoutRef.current = null;
          }, delayMs);
        }
      } else {
        startedAtRef.current = performance.now();
        setShouldShowLoading(true);
      }
      return () => {
        if (delayTimeoutRef.current) {
          window.clearTimeout(delayTimeoutRef.current);
          delayTimeoutRef.current = null;
        }
      };
    }

    if (delayTimeoutRef.current) {
      window.clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }

    if (!shouldShowLoading) return undefined;

    const elapsed = performance.now() - startedAtRef.current;
    const remainingMs = Math.max(minimumMs - elapsed, 0);

    if (remainingMs === 0) {
      setShouldShowLoading(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldShowLoading(false);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading, minimumMs, delayMs, shouldShowLoading]);

  useEffect(() => {
    return () => {
      if (delayTimeoutRef.current) {
        window.clearTimeout(delayTimeoutRef.current);
      }
    };
  }, []);

  return shouldShowLoading;
}
