import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

export default function ModalShell({
  isOpen,
  onClose,
  title,
  eyebrow = "",
  description = "",
  maxWidth = "xl",
  zIndex = 70,
  children,
  footer,
  panelClassName = "",
  bodyClassName = "",
  footerClassName = "",
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return undefined;
    }

    if (!shouldRender) return undefined;

    setIsClosing(true);
    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector(
      [
        "button:not([disabled])",
        "a[href]",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(",")
    );

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
  }, [isOpen]);

  const handlePanelKeyDown = (event) => {
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll(
        [
          "button:not([disabled])",
          "a[href]",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      ) || []
    ).filter(
      (node) => node instanceof HTMLElement && node.offsetParent !== null
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

  if (!shouldRender) return null;

  return (
    <div
      className={[
        "cf-modal-backdrop fixed inset-0 flex items-center justify-center bg-black/40 px-4 py-4",
        isClosing ? "is-closing" : "is-opening",
      ].join(" ")}
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        data-modal-panel="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={[
          "cf-modal-panel flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-2xl",
          isClosing ? "is-closing" : "is-opening",
          maxWidthClasses[maxWidth] ?? maxWidthClasses.xl,
          panelClassName,
        ].join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        <div className="shrink-0 border-b border-cf-border bg-gradient-to-b from-cf-surface-soft/70 to-cf-surface px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                  {eyebrow}
                </div>
              ) : null}
              <h2 id={titleId} className="text-lg font-semibold text-cf-text">
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="mt-1 max-w-xl text-sm leading-5 text-cf-text-muted"
                >
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className={["min-h-0 overflow-y-auto px-6 py-5", bodyClassName].join(
            " "
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={[
              "flex shrink-0 items-center gap-3 border-t border-cf-border px-6 py-4",
              footerClassName,
            ].join(" ")}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
