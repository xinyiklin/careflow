import { useTranslation } from "react-i18next";

import { Field, Textarea } from "../../../shared/ui";
import { formatFacilityLocalDateTime } from "../../../shared/utils/dates";
import type {
  PortalSchedulingAppointmentType,
  PortalSchedulingProvider,
  PortalSchedulingSlot,
} from "../api/schedule";

const REASON_MAX = 500;

type ConfirmStepProps = {
  provider: PortalSchedulingProvider;
  appointmentType: PortalSchedulingAppointmentType;
  slot: PortalSchedulingSlot;
  timeZone: string;
  reason: string;
  onReasonChange: (next: string) => void;
  submitError: string | null;
};

export function ConfirmStep({
  provider,
  appointmentType,
  slot,
  timeZone,
  reason,
  onReasonChange,
  submitError,
}: ConfirmStepProps) {
  const { t } = useTranslation();
  const when = formatFacilityLocalDateTime(slot.start_time, timeZone);

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        <SummaryItem
          label={t("schedule.providerLabel")}
          value={provider.display_name}
        />
        <SummaryItem
          label={t("schedule.visitTypeLabel")}
          value={`${appointmentType.name} · ${t("schedule.durationMinutes", {
            count: appointmentType.duration_minutes,
          })}`}
        />
        <SummaryItem label={t("schedule.timeLabel")} value={when} fullWidth />
      </dl>

      <Field
        label={t("schedule.reasonLabel")}
        helperText={`${reason.length}/${REASON_MAX}`}
      >
        <Textarea
          value={reason}
          onChange={(event) =>
            onReasonChange(event.target.value.slice(0, REASON_MAX))
          }
          maxLength={REASON_MAX}
          rows={4}
          placeholder={t("schedule.reasonPlaceholder")}
        />
      </Field>

      {submitError ? (
        <p
          role="alert"
          className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {submitError}
        </p>
      ) : null}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-border bg-surface-soft p-3 ${
        fullWidth ? "sm:col-span-2" : ""
      }`}
    >
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-text">{value}</dd>
    </div>
  );
}
