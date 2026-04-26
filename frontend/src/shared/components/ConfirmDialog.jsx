import { useEffect } from "react";
import { Button, ModalShell } from "./ui";

export default function ConfirmDialog({
  isOpen,
  title = "Please Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // "default" | "danger" | "warning"
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Enter") onConfirm?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm]);

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
          <Button variant="default" onClick={onCancel}>
            {cancelText}
          </Button>
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
