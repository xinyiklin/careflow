import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useMedicalSummary } from "../api/medicalSummary";
import { VisitCard } from "../components/VisitCard";

export function MedicalSummaryPage() {
  const { data, isError, error } = useMedicalSummary();

  const medications = data?.active_medications ?? [];
  const allergies = data?.active_allergies ?? [];
  const visits = data?.visits ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Medical Summary" />

      {isError ? (
        <p className="py-2 text-sm text-cf-text-muted">
          {getErrorMessage(error)}
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
              Active Medications ({medications.length})
            </h2>
            {medications.length === 0 ? (
              <p className="mt-2 text-sm text-cf-text-muted">
                No active medications on file.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-cf-border rounded-cf-card border border-cf-border bg-cf-surface">
                {medications.map((med) => (
                  <li key={med.id} className="px-4 py-2.5">
                    <div className="text-sm font-semibold text-cf-text">
                      {med.medication_name}
                    </div>
                    <div className="mt-0.5 text-xs text-cf-text-muted">
                      {[med.dose, med.route, med.frequency]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
              Allergies ({allergies.length})
            </h2>
            {allergies.length === 0 ? (
              <p className="mt-2 text-sm text-cf-text-muted">
                No known allergies on file.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-cf-border rounded-cf-card border border-cf-border bg-cf-surface">
                {allergies.map((allergy) => (
                  <li
                    key={allergy.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-cf-text">
                        {allergy.allergen}
                      </div>
                      <div className="mt-0.5 text-xs text-cf-text-muted">
                        {allergy.category_label} · {allergy.reaction}
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-cf-surface-soft px-2 py-0.5 text-[10px] font-semibold text-cf-text">
                      {allergy.severity_label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
              Visit history ({visits.length})
            </h2>
            {visits.length === 0 ? (
              <div className="mt-2">
                <EmptyState message="No signed visits yet. Recent appointments will appear here after your provider finalizes the visit note." />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
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
