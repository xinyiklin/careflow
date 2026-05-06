import { History, X } from "lucide-react";
import type { PointerEventHandler } from "react";

import { Button } from "../../../shared/components/ui";
import type {
  AppointmentFormData,
  AppointmentMode,
  AppointmentPatient,
  AppointmentResource,
  AppointmentStatusOption,
} from "../types";

type AppointmentModalHeaderProps = {
  dragHandleProps: {
    onPointerDown?: PointerEventHandler<HTMLElement>;
  };
  patientDisplayName: string;
  selectedPatient?: AppointmentPatient | null;
  mode: AppointmentMode;
  formData: AppointmentFormData;
  appointmentHeaderDate: string;
  appointmentHeaderTime: string;
  appointmentHeaderEndTime: string;
  selectedResource?: AppointmentResource | null;
  providerDisplayName?: string;
  selectedStatusOption?: AppointmentStatusOption | null;
  selectedStatusColor?: string | null;
  onOpenHistory?: () => void;
  onClose?: () => void;
};

function getAppointmentInitials(patientDisplayName: string): string {
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
  appointmentHeaderEndTime,
  selectedResource,
  providerDisplayName,
  selectedStatusOption,
  selectedStatusColor,
  onOpenHistory,
  onClose,
}: AppointmentModalHeaderProps) {
  const resourceDisplayName = selectedResource?.name || "No resource";
  const normalizedResourceName = resourceDisplayName.trim().toLowerCase();
  const normalizedProviderName = providerDisplayName?.trim().toLowerCase();
  const showProvider =
    Boolean(normalizedProviderName) &&
    normalizedProviderName !== normalizedResourceName;

  return (
    <div
      {...dragHandleProps}
      className="flex cursor-move flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-cf-surface px-5 py-4 select-none"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-cf-border bg-cf-surface-muted text-sm font-semibold text-cf-text">
            {getAppointmentInitials(patientDisplayName)}
          </div>
          {selectedPatient ? (
            <span className="absolute -right-0.5 -bottom-0.5 grid h-[1.125rem] w-[1.125rem] place-items-center rounded-full bg-cf-accent text-[10px] font-bold text-cf-page-bg ring-2 ring-cf-surface">
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
            <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight text-cf-text">
              {patientDisplayName || "Appointment"}
            </h2>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-cf-text-muted">
              <span>
                {appointmentHeaderDate} · {appointmentHeaderTime}
                {appointmentHeaderEndTime
                  ? ` - ${appointmentHeaderEndTime}`
                  : ""}
              </span>
              <span className="text-cf-border-strong">·</span>
              <span>{resourceDisplayName}</span>
              {showProvider ? (
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-cf-text-subtle transition hover:bg-cf-surface-muted hover:text-cf-text"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
