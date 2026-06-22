import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "./cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Visual width preset. */
  size?: "sm" | "md" | "lg";
  /** Optional footer slot (commonly a Button row). */
  footer?: ReactNode;
  /** Hide the close (X) icon button in the corner. */
  hideCloseButton?: boolean;
  /** Disable backdrop-click-to-close. */
  disableBackdropClose?: boolean;
};

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
} as const;

/**
 * Accessible modal dialog built on top of `<dialog>`. Uses native modal
 * behavior (focus trap, scrim, ESC close) when available and falls back
 * gracefully to a portal'd overlay otherwise.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
  hideCloseButton = false,
  disableBackdropClose = false,
}: ModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Sync open prop -> showModal()/close().
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Listen for native `close` (ESC, dialog.close()) so the parent state stays
  // in sync.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (disableBackdropClose) return;
    // Clicks on the backdrop have target === the dialog element.
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const dialogNode = (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "p-0 bg-transparent",
        "backdrop:bg-black/40 backdrop:backdrop-blur-sm",
        // Center the dialog content card inside the native dialog box.
        "w-full max-w-full m-0 mx-auto"
      )}
    >
      <div
        // Stops backdrop-click from firing on inner clicks.
        onClick={(event) => event.stopPropagation()}
        className={cn(
          // `overflow-hidden` clips full-bleed children (the bordered header
          // and the filled footer) to the card's radius — without it their
          // square corners poke out past `rounded-xl` at the bottom.
          "mx-auto my-8 w-full overflow-hidden rounded-xl border border-border bg-surface text-text shadow-[var(--shadow-lg)]",
          "transition-transform duration-150",
          SIZE_CLASS[size]
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              {title ? (
                <h2 className="text-base font-semibold tracking-tight text-text">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-text-muted">{description}</p>
              ) : null}
            </div>
            {!hideCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  "text-text-muted hover:bg-surface-soft hover:text-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                )}
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-soft px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialogNode, document.body);
}
