import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { Card, EmptyState, PageHeader } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useMedicalSummary } from "../api/medicalSummary";
import { AllergiesSummaryCard } from "../components/AllergiesSummaryCard";
import { MedicationsSummaryCard } from "../components/MedicationsSummaryCard";
import { VisitCard } from "../components/VisitCard";

export function MedicalSummaryPage() {
  const { t } = useTranslation();
  const { data, isError, error, isLoading } = useMedicalSummary();
  const summaryLoading = useMinimumLoading(isLoading);

  const medications = data?.active_medications ?? [];
  const allergies = data?.active_allergies ?? [];
  const visits = data?.visits ?? [];

  return (
    <div>
      <PageHeader
        title={t("records.pageTitle")}
        subtitle={t("records.subtitle")}
      />

      {isError ? (
        <Card tone="muted">
          <p className="text-sm text-text-muted">{getErrorMessage(error)}</p>
        </Card>
      ) : (
        <div className="space-y-5">
          <MedicationsSummaryCard
            medications={medications}
            loading={summaryLoading}
          />
          <AllergiesSummaryCard
            allergies={allergies}
            loading={summaryLoading}
          />

          <section
            aria-labelledby="records-visits-heading"
            className="space-y-3"
          >
            <h2
              id="records-visits-heading"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle"
            >
              {t("records.visitHistoryHeading")}
            </h2>
            {visits.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={t("records.noVisitsTitle")}
                description={t("records.noVisitsBody")}
              />
            ) : (
              <div className="space-y-3">
                {visits.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
