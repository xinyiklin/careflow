import { useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, ShieldAlert } from "lucide-react";

import PatientAllergyModal from "./PatientAllergyModal";
import usePatientAllergies from "../hooks/usePatientAllergies";
import { Badge, Button } from "../../../shared/components/ui";
import { getErrorMessage, getFieldErrors } from "../../../shared/utils/errors";

import type { EntityId } from "../../../shared/api/types";
import type {
  PatientAllergy,
  PatientAllergyPayload,
  PatientAllergySeverity,
} from "../api/allergies";
import type { FieldErrors } from "../../../shared/utils/errors";

type PatientAllergiesTabProps = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  canManage: boolean;
  enabled?: boolean;
};

type ModalState = {
  isOpen: boolean;
  allergy: PatientAllergy | null;
  error: string;
  fieldErrors: FieldErrors;
};

const severityVariant = {
  unknown: "muted",
  mild: "outline",
  moderate: "warning",
  severe: "danger",
  life_threatening: "danger",
} satisfies Record<
  PatientAllergySeverity,
  "danger" | "muted" | "outline" | "warning"
>;

const allergyRowClassName =
  "rounded-xl border border-cf-border bg-cf-surface px-4 py-3 transition hover:border-cf-border-strong hover:bg-cf-surface-muted/60";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSeverityVariant(allergy: PatientAllergy) {
  return severityVariant[allergy.severity || "unknown"];
}

function getAllergySummary(allergy: PatientAllergy) {
  return [
    allergy.category_label || allergy.category,
    allergy.status_label || allergy.status,
  ]
    .filter(Boolean)
    .join(" - ");
}

export default function PatientAllergiesTab({
  facilityId,
  patientId,
  canManage,
  enabled = true,
}: PatientAllergiesTabProps) {
  const patientIdNumber = Number(patientId || 0);
  const {
    allergies,
    allergiesQuery,
    createAllergyMutation,
    updateAllergyMutation,
    deleteAllergyMutation,
  } = usePatientAllergies({ facilityId, patientId, enabled });
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    allergy: null,
    error: "",
    fieldErrors: {},
  });
  const saving =
    createAllergyMutation.isPending ||
    updateAllergyMutation.isPending ||
    deleteAllergyMutation.isPending;
  const activeCount = useMemo(
    () => allergies.filter((allergy) => allergy.is_active !== false).length,
    [allergies]
  );

  const openModal = (allergy: PatientAllergy | null = null) =>
    setModalState({ isOpen: true, allergy, error: "", fieldErrors: {} });
  const closeModal = () =>
    setModalState({ isOpen: false, allergy: null, error: "", fieldErrors: {} });

  const handleSave = async (values: PatientAllergyPayload) => {
    try {
      if (modalState.allergy?.id) {
        await updateAllergyMutation.mutateAsync({
          allergyId: modalState.allergy.id,
          values,
        });
      } else {
        await createAllergyMutation.mutateAsync(values);
      }
      closeModal();
    } catch (error) {
      setModalState((current) => ({
        ...current,
        error: getErrorMessage(
          error,
          "Check the allergy details and try again."
        ),
        fieldErrors: getFieldErrors(error),
      }));
    }
  };

  const handleDelete = async () => {
    const allergyId = modalState.allergy?.id;
    if (!allergyId) return;

    try {
      await deleteAllergyMutation.mutateAsync(allergyId);
      closeModal();
    } catch (error) {
      setModalState((current) => ({
        ...current,
        error: getErrorMessage(error, "Couldn't remove this allergy."),
        fieldErrors: getFieldErrors(error),
      }));
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <ShieldAlert className="h-4 w-4 text-cf-warning-text" />
            Allergies
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={activeCount ? "warning" : "muted"}>
              {activeCount} active
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={!canManage || !patientIdNumber}
              onClick={() => openModal()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Allergy
            </Button>
          </div>
        </div>

        {allergiesQuery.isLoading ? null : allergiesQuery.error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-cf-text">
                Couldn&apos;t load allergies
              </div>
              <div className="text-sm text-cf-text-muted">
                Check your connection and try again.
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void allergiesQuery.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : allergies.length ? (
          allergies.map((allergy) => (
            <div key={allergy.id} className={allergyRowClassName}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getSeverityVariant(allergy)}>
                      {allergy.severity_label || "Unknown"}
                    </Badge>
                    {allergy.is_active === false ? (
                      <Badge variant="muted">
                        {allergy.status_label || "Inactive"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-cf-text">
                    {allergy.allergen || "Allergen not recorded"}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-cf-text-muted">
                    {getAllergySummary(allergy)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-cf-text-muted">
                    {allergy.reaction || "Reaction not recorded"}
                  </div>
                  <div className="mt-1 text-xs text-cf-text-subtle">
                    Onset: {formatDate(allergy.onset_date)}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => openModal(allergy)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-6 text-center text-sm text-cf-text-muted">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-cf-text-subtle" />
            No allergies recorded.
          </div>
        )}
      </section>

      <PatientAllergyModal
        isOpen={modalState.isOpen}
        patientId={patientIdNumber}
        allergy={modalState.allergy}
        saving={saving}
        canManage={canManage}
        error={modalState.error}
        fieldErrors={modalState.fieldErrors}
        onClose={closeModal}
        onSubmit={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
