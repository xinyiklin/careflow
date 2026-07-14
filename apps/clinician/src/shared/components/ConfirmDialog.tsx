import { Button, ModalShell } from "./ui";

type ConfirmDialogVariant = "default" | "danger" | "warning";

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  /** Acknowledge-only mode: hide the cancel button so there is no way to
   * proceed with the blocked action — the single button only dismisses. */
  hideCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title = "Please Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmVariant =
    variant === "danger"
      ? "danger"
      : variant === "warning"
        ? "warning"
        : "primary";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="md"
      zIndex={80}
      footer={
        <>
          {!hideCancel && (
            <Button variant="default" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-cf-text-muted">{message}</p>
    </ModalShell>
  );
}
