import { Check, UserRound, X } from "lucide-react";

import { Badge } from "../../../shared/components/ui";
import { getPrimaryPhone } from "./patientModalData";

export default function PatientModalHeader({
  completionPercent,
  dragHandleProps,
  mode,
  onClose,
  patient,
  patientInitials,
  patientName,
  watchedValues,
}) {
  return (
    <div
      {...dragHandleProps}
      className="flex cursor-move select-none items-center justify-between gap-4 border-b border-cf-border bg-gradient-to-br from-cf-surface via-cf-surface to-cf-surface-muted/75 px-5 py-5 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-base font-semibold tracking-[0.12em] text-blue-900 ring-1 ring-blue-200/70">
          {mode === "edit" ? (
            patientInitials
          ) : (
            <UserRound className="h-5 w-5" />
          )}
          <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-cf-surface">
            <Check className="h-3 w-3" />
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
            {mode === "edit"
              ? "Registration · Patient record"
              : "Registration · New patient"}
            <span className="font-mono tracking-tight text-cf-text-muted">
              {patient?.chart_number || "MRN pending"}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 flex-col gap-1.5">
            <h2 className="truncate text-2xl font-semibold tracking-tight text-cf-text">
              {patientName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cf-text-muted">
              <span>{watchedValues?.date_of_birth || "DOB pending"}</span>
              <span className="text-cf-border-strong">·</span>
              <span>{getPrimaryPhone(watchedValues) || "Phone pending"}</span>
              <span className="text-cf-border-strong">·</span>
              <span>{completionPercent}% intake ready</span>
              {mode === "edit" && patient?.is_active === false ? (
                <Badge variant="warning">Inactive</Badge>
              ) : null}
            </div>
          </div>
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
