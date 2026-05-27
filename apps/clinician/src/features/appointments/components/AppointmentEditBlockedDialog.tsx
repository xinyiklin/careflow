import { Button, ModalShell } from "../../../shared/components/ui";

type ActiveEditor = {
  user_name?: string | null;
} | null;

type AppointmentEditBlockedDialogProps = {
  activeEditor?: ActiveEditor;
  isOpen: boolean;
  onClose: () => void;
};

function getActiveEditorName(activeEditor?: ActiveEditor): string {
  return activeEditor?.user_name || "Another user";
}

export default function AppointmentEditBlockedDialog({
  activeEditor,
  isOpen,
  onClose,
}: AppointmentEditBlockedDialogProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Appointment in use"
      maxWidth="md"
      zIndex={80}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className="text-sm leading-6 text-cf-text-muted">
        {getActiveEditorName(activeEditor)} is editing this appointment. It
        unlocks after 10 minutes of no activity.
      </p>
    </ModalShell>
  );
}
