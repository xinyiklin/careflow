import { useNavigate } from "react-router-dom";
import { ArrowRight, Pill } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, Skeleton } from "../../../shared/ui";

type MedicationsSummaryCardProps = {
  activeCount: number;
  pendingRefillCount: number;
  loading?: boolean;
};

/**
 * Shared min-height so the loading / no-refills / pending-refills states
 * keep matching outer dimensions. Sized to the tallest populated state
 * (count line + Pending refills badge + CTA) so swapping in shorter
 * variants doesn't shrink the card.
 */
const SUMMARY_MIN_HEIGHT = "min-h-[168px]";

export function MedicationsSummaryCard({
  activeCount,
  pendingRefillCount,
  loading = false,
}: MedicationsSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasPending = pendingRefillCount > 0;

  if (loading) {
    return (
      <Card
        aria-busy="true"
        aria-live="polite"
        className={`${SUMMARY_MIN_HEIGHT} flex flex-col justify-between`}
      >
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </Card>
    );
  }

  return (
    <Card
      aria-labelledby="dashboard-meds-heading"
      className={`${SUMMARY_MIN_HEIGHT} flex flex-col justify-between`}
    >
      <div>
        <p
          id="dashboard-meds-heading"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
        >
          <Pill size={13} aria-hidden="true" />
          {t("dashboard.medicationsHeading")}
        </p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-text">
          {t("dashboard.activeMedicationsCount", { count: activeCount })}
        </p>
        {hasPending ? (
          <div className="mt-2">
            <Badge tone="warning">
              {t("dashboard.pendingRefills", { count: pendingRefillCount })}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/medications")}
          trailingIcon={<ArrowRight size={14} aria-hidden="true" />}
        >
          {t("dashboard.viewMedications")}
        </Button>
      </div>
    </Card>
  );
}
