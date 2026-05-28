import { formatDateOnly } from "../../../shared/utils/dates";
import type { PortalMedication } from "../api/medications";
import { RefillRequestButton } from "./RefillRequestButton";

function detailsLine(med: PortalMedication): string {
  return [med.dose, med.route, med.frequency]
    .filter((part) => part && part.trim())
    .join(" · ");
}

function dateRange(med: PortalMedication): string {
  const start = formatDateOnly(med.start_date);
  if (!med.end_date) {
    return start === "—" ? "Ongoing" : `${start} – Ongoing`;
  }
  const end = formatDateOnly(med.end_date);
  return `${start} – ${end}`;
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
  const showRefill =
    medication.status === "active" && typeof onRequestRefill === "function";

  return (
    <li className="border-t border-cf-border py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-cf-text">
            {medication.medication_name}
          </div>
          {details ? (
            <div className="mt-0.5 text-xs text-cf-text-muted">{details}</div>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-cf-text-subtle">
            {medication.prescriber_name ? (
              <>
                <span>{medication.prescriber_name}</span>
                <span className="text-cf-border-strong">·</span>
              </>
            ) : null}
            <span>{dateRange(medication)}</span>
          </div>
        </div>
        {showRefill ? (
          <RefillRequestButton
            hasPendingRequest={hasPendingRefill}
            onClick={() => onRequestRefill?.(medication)}
          />
        ) : null}
      </div>
    </li>
  );
}
