import { useState } from "react";

import { Badge } from "../../../shared/components/ui/Badge";
import { formatFacilityLocalDateTime } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useCancelAppointment } from "../../schedule/api/schedule";
import type { PortalAppointment } from "../api/appointments";

const CANCELLED_CODES = new Set(["cancelled", "canceled", "no_show", "noshow"]);

function statusTone(
  code: string
): "neutral" | "success" | "warning" | "danger" {
  const normalized = (code || "").toLowerCase();
  if (CANCELLED_CODES.has(normalized)) return "danger";
  if (normalized === "completed" || normalized === "checked_out") {
    return "success";
  }
  if (normalized === "confirmed" || normalized === "scheduled") {
    return "neutral";
  }
  return "neutral";
}

export function AppointmentRow({
  appointment,
}: {
  appointment: PortalAppointment;
}) {
  const when = formatFacilityLocalDateTime(
    appointment.appointment_time,
    appointment.facility_timezone
  );
  const provider = appointment.provider_display_name || "—";
  const type = appointment.appointment_type_name;

  const cancelMutation = useCancelAppointment();
  const [error, setError] = useState<string | null>(null);
  const canCancel = Boolean(appointment.cancel_eligibility?.can_cancel);
  const cutoffHours = appointment.cancel_eligibility?.cutoff_hours ?? 0;

  const handleCancel = async () => {
    if (!canCancel) return;
    const ok = window.confirm(
      "Cancel this appointment? You'll need to call the office if you change your mind."
    );
    if (!ok) return;
    setError(null);
    try {
      await cancelMutation.mutateAsync(appointment.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <li className="border-t border-cf-border py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-cf-text">{when}</div>
          {type ? (
            <div className="mt-0.5 text-xs text-cf-text-muted">{type}</div>
          ) : null}
        </div>
        <Badge tone={statusTone(appointment.status_code)}>
          {appointment.status_name}
        </Badge>
      </div>
      <div className="mt-1.5 text-xs text-cf-text-subtle">
        <span>{provider}</span>
        <span className="mx-1.5 text-cf-border-strong">·</span>
        <span>{appointment.facility_name}</span>
        {appointment.room ? (
          <>
            <span className="mx-1.5 text-cf-border-strong">·</span>
            <span>Room {appointment.room}</span>
          </>
        ) : null}
      </div>

      {canCancel ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-cf-text-subtle">
            Cancel online up to {cutoffHours}h before the visit
          </span>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="rounded-cf-control border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-1 text-[11px] text-cf-danger-text">{error}</p>
      ) : null}
    </li>
  );
}
