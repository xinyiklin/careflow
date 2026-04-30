import { PatientHubContent } from "../PatientHubContent";

export default function PatientHubModal({
  isOpen,
  patientId,
  initialTab,
  onClose,
}) {
  if (!isOpen || !patientId) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/45 px-4 py-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[95dvh] w-full max-w-[min(1720px,96vw)] flex-col overflow-hidden rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-page-bg shadow-[var(--shadow-panel-lg)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1">
          <PatientHubContent
            patientId={patientId}
            initialTab={initialTab}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
