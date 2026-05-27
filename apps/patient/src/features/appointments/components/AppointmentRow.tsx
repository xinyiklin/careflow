import { Badge } from "../../../shared/components/ui/Badge";
import { formatFacilityLocalDateTime } from "../../../shared/utils/dates";
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
    </li>
  );
}
