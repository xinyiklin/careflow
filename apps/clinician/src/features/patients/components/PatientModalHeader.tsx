import { UserRound, X } from "lucide-react";

import type { HTMLAttributes } from "react";

type PatientModalHeaderProps = {
  dragHandleProps: HTMLAttributes<HTMLDivElement>;
  mode: "create" | "edit";
  onClose?: () => void;
  patientInitials: string;
};

export default function PatientModalHeader({
  dragHandleProps,
  mode,
  onClose,
  patientInitials,
}: PatientModalHeaderProps) {
  const title =
    mode === "edit" ? "Patient Registration" : "New Patient Registration";

  return (
    <div
      {...dragHandleProps}
      className="flex cursor-move select-none items-center justify-between gap-4 border-b border-cf-border bg-cf-surface px-5 py-4 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-sm font-semibold tracking-[0.08em] text-cf-text-muted">
          {mode === "edit" ? (
            patientInitials
          ) : (
            <UserRound className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
            Registration
          </div>
          <h2 className="truncate text-lg font-semibold text-cf-text">
            {title}
          </h2>
        </div>
      </div>

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClose}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
