import { useEffect, useRef, useState } from "react";

const DEFAULT_MODAL_EXIT_MS = 180;

export function useModalPresence(
  isOpen: boolean,
  exitMs = DEFAULT_MODAL_EXIT_MS
) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return undefined;
    }

    if (!shouldRender) return undefined;

    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, exitMs);

    return () => window.clearTimeout(timeoutId);
  }, [exitMs, isOpen, shouldRender]);

  return {
    isClosing: shouldRender && !isOpen,
    shouldRender,
  };
}

export function useLatestOpenValue<T>(value: T, isOpen: boolean): T {
  const valueRef = useRef(value);

  if (isOpen) {
    valueRef.current = value;
  }

  return isOpen ? value : valueRef.current;
}
