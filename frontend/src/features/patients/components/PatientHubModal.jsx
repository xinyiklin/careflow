import { X } from "lucide-react";

import { PatientHubContent } from "../PatientHubContent";

export default function PatientHubModal({ isOpen, patientId, onClose }) {
  if (!isOpen || !patientId) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/45 px-4 py-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[95dvh] w-full max-w-[min(1720px,96vw)] flex-col overflow-hidden rounded-[1.75rem] bg-cf-page-bg shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cf-border bg-cf-surface text-cf-text-subtle shadow-sm transition hover:bg-cf-surface-muted hover:text-cf-text"
          aria-label="Close patient hub"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-h-0 flex-1">
          <PatientHubContent patientId={patientId} />
        </div>
      </div>
    </div>
  );
}
