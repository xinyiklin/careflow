import { useEffect } from "react";

import { Button } from "../../../shared/components/ui";

type SlotBeingBookedDialogProps = {
  isOpen: boolean;
  name?: string;
  isOverriding?: boolean;
  onOverride: () => void;
  onCancel: () => void;
};

// Intentionally lightweight: a single line + actions, no ModalShell header /
// footer chrome, for what is just a one-line advisory confirm.
export default function SlotBeingBookedDialog({
  isOpen,
  name,
  isOverriding,
  onOverride,
  onCancel,
}: SlotBeingBookedDialogProps) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xs rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel-lg)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="text-sm text-cf-text">
          <span className="font-semibold">{name || "Another user"}</span> is
          booking this slot.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="default" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="warning"
            size="sm"
            onClick={onOverride}
            disabled={isOverriding}
          >
            {isOverriding ? "Opening…" : "Open anyway"}
          </Button>
        </div>
      </div>
    </div>
  );
}
