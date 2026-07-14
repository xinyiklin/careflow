import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, Modal } from "../../../shared/ui";
import type { BadgeTone } from "../../../shared/ui";
import { formatFacilityLocalDateTime } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useCancelAppointment } from "../../schedule/api/schedule";
import type { PortalAppointment } from "../api/appointments";

const CANCELLED_CODES = new Set(["cancelled", "canceled", "no_show", "noshow"]);

function statusTone(code: string): BadgeTone {
  const normalized = (code || "").toLowerCase();
  if (CANCELLED_CODES.has(normalized)) return "danger";
  if (normalized === "completed" || normalized === "checked_out") {
    return "success";
  }
  return "accent";
}

type AppointmentRowProps = {
  appointment: PortalAppointment;
};

export function AppointmentRow({ appointment }: AppointmentRowProps) {
  const { t } = useTranslation();
  const when = formatFacilityLocalDateTime(
    appointment.appointment_time,
    appointment.facility_timezone
  );
  const provider = appointment.provider_display_name || "";
  const type = appointment.appointment_type_name;

  const cancelMutation = useCancelAppointment();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canCancel = Boolean(appointment.cancel_eligibility?.can_cancel);
  const cutoffHours = appointment.cancel_eligibility?.cutoff_hours ?? 0;

  const handleConfirmCancel = async () => {
    setError(null);
    try {
      await cancelMutation.mutateAsync(appointment.id);
      setConfirmOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <Card padded={false} className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text">{provider}</div>
            {type ? (
              <div className="mt-0.5 text-xs text-text-muted">{type}</div>
            ) : null}
            <div className="mt-2 text-sm text-text-muted">{when}</div>
            <div className="mt-1 text-xs text-text-subtle">
              <span>{appointment.facility_name}</span>
              {appointment.room ? (
                <span>
                  {" "}
                  · {t("appointments.roomLabel", { room: appointment.room })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Badge tone={statusTone(appointment.status_code)}>
              {appointment.status_name}
            </Badge>
            {canCancel ? (
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setConfirmOpen(true);
                  }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending
                    ? t("appointments.cancelling")
                    : t("appointments.cancel")}
                </Button>
                <span className="text-[11px] text-text-subtle">
                  {t("appointments.cancelCutoffHint", { hours: cutoffHours })}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!cancelMutation.isPending) setConfirmOpen(false);
        }}
        title={t("appointments.confirmCancelTitle")}
        description={t("appointments.confirmCancelBody")}
        size="sm"
        disableBackdropClose={cancelMutation.isPending}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={cancelMutation.isPending}
            >
              {t("appointments.confirmKeep")}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              isLoading={cancelMutation.isPending}
            >
              {t("appointments.confirmCancel")}
            </Button>
          </>
        }
      >
        <div className="text-sm text-text-muted">
          <p className="font-medium text-text">{provider}</p>
          {type ? <p className="mt-0.5 text-text-muted">{type}</p> : null}
          <p className="mt-1">{when}</p>
          {error ? (
            <p role="alert" className="mt-3 text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
