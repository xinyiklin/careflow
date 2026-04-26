import { History, X } from "lucide-react";

import { Button } from "../../../shared/components/ui";
import { formatTimeInTimeZone } from "../../../shared/utils/dateTime";

function getAppointmentInitials(patientDisplayName) {
  return (patientDisplayName || "AP")
    .split(/\s|,/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function AppointmentModalHeader({
  dragHandleProps,
  patientDisplayName,
  selectedPatient,
  mode,
  formData,
  appointmentHeaderDate,
  appointmentHeaderTime,
  computedEndTime,
  timeZone,
  durationMinutes,
  selectedResource,
  providerDisplayName,
  selectedStatusOption,
  selectedStatusColor,
  onOpenHistory,
  onClose,
}) {
  return (
    <div
      {...dragHandleProps}
      className="flex cursor-move flex-wrap items-center justify-between gap-4 border-b border-cf-border bg-gradient-to-b from-cf-surface to-cf-surface-soft/40 px-7 py-5 select-none"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-base font-semibold text-blue-900 ring-1 ring-blue-200/70">
            {getAppointmentInitials(patientDisplayName)}
          </div>
          {selectedPatient ? (
            <span className="absolute -right-0.5 -bottom-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-cf-surface">
              ✓
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Scheduler ·{" "}
            {mode === "edit" ? "Edit appointment" : "New appointment"}
            <span className="text-cf-border-strong">·</span>
            <span className="font-mono text-[11px] tracking-tight text-cf-text-muted">
              {formData.id ? `APT-${formData.id}` : "APT-new"}
            </span>
          </div>
          <div className="mt-0.5 min-w-0">
            <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-cf-text">
              {patientDisplayName || "Appointment"}
            </h2>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-cf-text-muted">
              <span>
                {appointmentHeaderDate} · {appointmentHeaderTime}
                {computedEndTime
                  ? ` - ${formatTimeInTimeZone(
                      computedEndTime,
                      timeZone,
                      "h:mm a"
                    )}`
                  : ""}
                {durationMinutes ? ` (${durationMinutes} min)` : ""}
              </span>
              <span className="text-cf-border-strong">·</span>
              <span>{selectedResource?.name || "No resource"}</span>
              {providerDisplayName ? (
                <>
                  <span className="text-cf-border-strong">·</span>
                  <span>{providerDisplayName}</span>
                </>
              ) : null}
              {selectedStatusOption?.name ? (
                <>
                  <span className="text-cf-border-strong">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: selectedStatusColor || "currentColor",
                      }}
                    />
                    {selectedStatusOption.name}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mode === "edit" ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onOpenHistory?.()}
          >
            <History className="h-4 w-4" />
            Activity Log
          </Button>
        ) : null}

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-cf-text-subtle transition hover:bg-cf-surface hover:text-cf-text"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
