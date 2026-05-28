import { useMemo, useState } from "react";

import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useMedications, type PortalMedication } from "../api/medications";
import { useRefillRequests } from "../api/refills";
import { MedicationRow } from "../components/MedicationRow";
import { RefillRequestList } from "../components/RefillRequestList";
import { RefillRequestModal } from "../components/RefillRequestModal";

type Groups = {
  active: PortalMedication[];
  inactive: PortalMedication[];
};

function splitByStatus(meds: PortalMedication[]): Groups {
  const active: PortalMedication[] = [];
  const inactive: PortalMedication[] = [];
  for (const med of meds) {
    if (med.status === "active") {
      active.push(med);
    } else {
      inactive.push(med);
    }
  }
  return { active, inactive };
}

export function MedicationsPage() {
  const { data, isError, error } = useMedications();
  const refillsQuery = useRefillRequests();

  const { active, inactive } = useMemo(() => splitByStatus(data ?? []), [data]);
  const medications = data ?? [];

  const pendingMedicationIds = useMemo(() => {
    const ids = new Set<number>();
    for (const refill of refillsQuery.data ?? []) {
      if (refill.status === "pending") {
        ids.add(refill.medication_id);
      }
    }
    return ids;
  }, [refillsQuery.data]);

  const [refillTarget, setRefillTarget] = useState<PortalMedication | null>(
    null
  );

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Medications" />

      {isError ? (
        <p className="py-2 text-sm text-cf-text-muted">
          {getErrorMessage(error)}
        </p>
      ) : medications.length === 0 ? (
        <EmptyState message="No medications on file." />
      ) : (
        <div className="space-y-5">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
              Active
            </h2>
            {active.length === 0 ? (
              <p className="mt-2 text-sm text-cf-text-muted">
                No active medications.
              </p>
            ) : (
              <ul className="mt-1">
                {active.map((medication) => (
                  <MedicationRow
                    key={medication.id}
                    medication={medication}
                    hasPendingRefill={pendingMedicationIds.has(medication.id)}
                    onRequestRefill={(med) => setRefillTarget(med)}
                  />
                ))}
              </ul>
            )}
          </section>

          {inactive.length > 0 ? (
            <section className="border-t border-cf-border pt-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
                Inactive
              </h2>
              <ul className="mt-1">
                {inactive.map((medication) => (
                  <MedicationRow key={medication.id} medication={medication} />
                ))}
              </ul>
            </section>
          ) : null}

          <RefillRequestList />
        </div>
      )}

      {refillTarget ? (
        <RefillRequestModal
          medication={refillTarget}
          onClose={() => setRefillTarget(null)}
        />
      ) : null}
    </div>
  );
}
