import { useEffect, useRef } from "react";

import type { KeyboardEvent, RefObject } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Focus-trap, ESC-to-close, initial focus, and return-focus for modals
 * that build their own panel layout instead of using ModalShell.
 */
export default function useModalFocusTrap(
  panelRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  onClose?: () => void
) {
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector(focusableSelector);

    window.setTimeout(() => {
      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus();
      } else {
        panel?.focus();
      }
    }, 0);

    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, panelRef]);

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll(focusableSelector) || []
    ).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.offsetParent !== null
    );

    if (!focusable.length) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return { handlePanelKeyDown };
}
