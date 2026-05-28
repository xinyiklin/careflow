import { useNavigate } from "react-router-dom";
import { ArrowRight, Pill } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Card, Skeleton } from "../../../shared/ui";
import type { PortalSummaryMedication } from "../api/medicalSummary";

const MAX_PREVIEW = 3;

/**
 * Shared min-height so the card holds its dimensions across loading,
 * empty (zero meds), and populated states. Sized to comfortably fit the
 * header row plus the 3-item preview list.
 */
const SUMMARY_MIN_HEIGHT = "min-h-[176px]";

type MedicationsSummaryCardProps = {
  medications: PortalSummaryMedication[];
  loading?: boolean;
};

export function MedicationsSummaryCard({
  medications,
  loading = false,
}: MedicationsSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const count = medications.length;

  const previewNames = medications
    .slice(0, MAX_PREVIEW)
    .map((med) => med.medication_name);
  const remaining = Math.max(count - previewNames.length, 0);

  if (loading) {
    return (
      <Card aria-busy="true" aria-live="polite" className={SUMMARY_MIN_HEIGHT}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/5" />
          </div>
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
        <Skeleton lines={3} className="mt-4" />
      </Card>
    );
  }

  return (
    <Card aria-labelledby="records-meds-heading" className={SUMMARY_MIN_HEIGHT}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            id="records-meds-heading"
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
          >
            <Pill size={13} aria-hidden="true" />
            {t("records.medicationsHeading")}
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-text">
            {t("records.activeMedicationsSummary", { count })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/medications")}
          trailingIcon={<ArrowRight size={14} aria-hidden="true" />}
        >
          {t("records.viewAllMedications")}
        </Button>
      </header>

      {previewNames.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {previewNames.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2 text-sm text-text"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span className="truncate">{name}</span>
            </li>
          ))}
          {remaining > 0 ? (
            <li className="text-xs text-text-subtle">
              {t("records.medicationsMore", { count: remaining })}
            </li>
          ) : null}
        </ul>
      ) : null}
    </Card>
  );
}
