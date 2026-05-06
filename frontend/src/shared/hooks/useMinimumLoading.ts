import { useEffect, useRef, useState } from "react";

const DEFAULT_MINIMUM_LOADING_MS = 650;

export default function useMinimumLoading(
  isLoading: boolean,
  minimumMs = DEFAULT_MINIMUM_LOADING_MS
): boolean {
  const [shouldShowLoading, setShouldShowLoading] = useState(isLoading);
  const startedAtRef = useRef(isLoading ? performance.now() : 0);

  useEffect(() => {
    if (isLoading) {
      startedAtRef.current = performance.now();
      setShouldShowLoading(true);
      return undefined;
    }

    if (!shouldShowLoading) {
      return undefined;
    }

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
  }, [isLoading, minimumMs, shouldShowLoading]);

  return shouldShowLoading;
}
