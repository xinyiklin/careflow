import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useAllergies } from "../api/allergies";
import { AllergyRow } from "../components/AllergyRow";

export function AllergiesPage() {
  const { data, isError, error } = useAllergies();
  const allergies = data ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Allergies" />

      {isError ? (
        <p className="py-2 text-sm text-cf-text-muted">
          {getErrorMessage(error)}
        </p>
      ) : allergies.length === 0 ? (
        <EmptyState message="No known allergies on file." />
      ) : (
        <ul>
          {allergies.map((allergy) => (
            <AllergyRow key={allergy.id} allergy={allergy} />
          ))}
        </ul>
      )}
    </div>
  );
}
