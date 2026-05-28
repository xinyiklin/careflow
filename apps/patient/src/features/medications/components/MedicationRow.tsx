import { useTranslation } from "react-i18next";

import { Badge, Card } from "../../../shared/ui";
import { formatDateOnly } from "../../../shared/utils/dates";
import type { PortalMedication } from "../api/medications";
import { RefillRequestButton } from "./RefillRequestButton";

function detailsLine(med: PortalMedication): string {
  return [med.dose, med.route, med.frequency]
    .filter((part) => part && part.trim())
    .join(" · ");
}

function useDateRangeLabel(med: PortalMedication): string {
  const { t } = useTranslation();
  const start = med.start_date ? formatDateOnly(med.start_date) : "";
  if (!med.end_date) {
    if (!start) return t("medications.ongoing");
    return t("medications.startedOn", { date: start });
  }
  const end = formatDateOnly(med.end_date);
  if (!start) return t("medications.endedOn", { date: end });
  return t("medications.dateRange", { start, end });
}

function statusTone(status: PortalMedication["status"]) {
  if (status === "active") return "success" as const;
  if (status === "discontinued") return "danger" as const;
  return "neutral" as const;
}

type MedicationRowProps = {
  medication: PortalMedication;
  hasPendingRefill?: boolean;
  onRequestRefill?: (medication: PortalMedication) => void;
};

export function MedicationRow({
  medication,
  hasPendingRefill = false,
  onRequestRefill,
}: MedicationRowProps) {
  const details = detailsLine(medication);
  const rangeLabel = useDateRangeLabel(medication);
  const showRefill =
    medication.status === "active" && typeof onRequestRefill === "function";

  return (
    <Card padded={false}>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-text">
              {medication.medication_name}
            </span>
            <Badge tone={statusTone(medication.status)}>
              {medication.status_label}
            </Badge>
          </div>
          {details ? (
            <div className="text-sm text-text-muted">{details}</div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-subtle">
            {medication.prescriber_name ? (
              <>
                <span>{medication.prescriber_name}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>{rangeLabel}</span>
          </div>
        </div>
        {showRefill ? (
          <div className="shrink-0">
            <RefillRequestButton
              hasPendingRequest={hasPendingRefill}
              onClick={() => onRequestRefill?.(medication)}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
