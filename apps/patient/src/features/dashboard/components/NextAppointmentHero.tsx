import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Card, EmptyState, Modal, Skeleton } from "../../../shared/ui";
import { formatFacilityLocalDateTime } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import type { PortalAppointment } from "../../appointments/api/appointments";
import { useCancelAppointment } from "../../schedule/api/schedule";

type NextAppointmentHeroProps = {
  appointment: PortalAppointment | null;
  loading?: boolean;
};

/**
 * Shared min-height so the hero card occupies the same vertical space
 * regardless of which inner state (loading / empty / populated) is showing.
 * Chosen to comfortably fit the tallest populated layout (tag + provider
 * line + large date + location + button row).
 */
const HERO_MIN_HEIGHT = "min-h-[208px]";

export function NextAppointmentHero({
  appointment,
  loading = false,
}: NextAppointmentHeroProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cancelMutation = useCancelAppointment();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <Card
        tone="accent"
        aria-busy="true"
        aria-live="polite"
        className={`${HERO_MIN_HEIGHT} space-y-5`}
      >
        <Skeleton className="h-3 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4 sm:h-8" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </Card>
    );
  }

  if (!appointment) {
    return (
      <Card
        padded={false}
        className={`${HERO_MIN_HEIGHT} flex items-center justify-center`}
      >
        <EmptyState
          icon={Calendar}
          title={t("dashboard.planNextVisitTitle")}
          description={t("dashboard.planNextVisitBody")}
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate("/schedule")}
            >
              {t("dashboard.bookAppointment")}
            </Button>
          }
          className="w-full border-none bg-transparent py-4"
        />
      </Card>
    );
  }

  const canCancel = Boolean(appointment.cancel_eligibility?.can_cancel);
  const when = formatFacilityLocalDateTime(
    appointment.appointment_time,
    appointment.facility_timezone
  );
  const provider = appointment.provider_display_name?.trim() || "";
  const type = appointment.appointment_type_name;

  const handleCancel = async () => {
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
      <Card
        tone="accent"
        aria-labelledby="dashboard-next-appt-heading"
        className={`${HERO_MIN_HEIGHT} space-y-5`}
      >
        <header>
          <p
            id="dashboard-next-appt-heading"
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
          >
            <Calendar size={13} className="text-accent" aria-hidden="true" />
            {t("dashboard.nextAppointmentHeading")}
          </p>
          {(provider || type) && (
            <p className="mt-2 text-sm font-medium text-text">
              {type ? <span>{type}</span> : null}
              {type && provider ? (
                <span className="mx-1.5 text-text-subtle">with</span>
              ) : null}
              {provider ? <span>{provider}</span> : null}
            </p>
          )}
        </header>

        <div className="space-y-1.5">
          <p className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {when}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-text-muted">
            <MapPin size={14} aria-hidden="true" />
            <span>{appointment.facility_name}</span>
            {appointment.room ? (
              <>
                <span className="text-text-subtle">·</span>
                <span>
                  {t("appointments.roomLabel", { room: appointment.room })}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/schedule")}
          >
            {t("dashboard.rescheduleAppointment")}
          </Button>
          {canCancel ? (
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirmOpen(true)}
            >
              {t("dashboard.cancelAppointment")}
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!cancelMutation.isPending) {
            setConfirmOpen(false);
          }
        }}
        title={t("appointments.confirmCancelTitle")}
        description={t("appointments.confirmCancelBody")}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setConfirmOpen(false)}
              disabled={cancelMutation.isPending}
            >
              {t("appointments.confirmKeep")}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleCancel}
              isLoading={cancelMutation.isPending}
            >
              {t("appointments.confirmCancel")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          {type ? <span className="font-medium text-text">{type}</span> : null}
          {type && provider ? (
            <span className="mx-1.5 text-text-subtle">with</span>
          ) : null}
          {provider ? <span>{provider}</span> : null}
          {(type || provider) && <br />}
          <span>{when}</span>
        </p>
      </Modal>
    </>
  );
}
