import { useMemo, useState } from "react";
import { Pencil, Pill, Plus, RotateCcw, Trash2 } from "lucide-react";

import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import { Badge, Button, Notice } from "../../../../shared/components/ui";
import usePatientMedications from "../../hooks/usePatientMedications";
import MedicationForm from "./MedicationForm";

import type { EntityId } from "../../../../shared/api/types";
import type {
  MedicationPayload,
  MedicationStatus,
  PatientMedication,
} from "../../api/medications";

type PatientMedicationsTabProps = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  canManage?: boolean;
};

type StatusCounts = Record<MedicationStatus, number>;

const statusBadgeVariant: Record<
  MedicationStatus,
  "success" | "warning" | "muted"
> = {
  active: "success",
  inactive: "warning",
  discontinued: "muted",
};

function formatMedicationDate(value?: string | null) {
  if (!value) return "";

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

function getDateRange(medication: PatientMedication) {
  const start = formatMedicationDate(medication.start_date);
  const end = formatMedicationDate(medication.end_date);

  if (start && end) return `${start} - ${end}`;
  if (start) return `Started ${start}`;
  if (end) return `Ended ${end}`;
  return "Dates not set";
}

function getStatusLabel(status: MedicationStatus) {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Discontinued";
}

function sortMedications(medications: PatientMedication[]) {
  const rank: Record<MedicationStatus, number> = {
    active: 0,
    inactive: 1,
    discontinued: 2,
  };

  return [...medications].sort((a, b) => {
    const statusDelta = rank[a.status] - rank[b.status];
    if (statusDelta !== 0) return statusDelta;
    return a.medication_name.localeCompare(b.medication_name);
  });
}

function countStatuses(medications: PatientMedication[]): StatusCounts {
  return medications.reduce<StatusCounts>(
    (counts, medication) => ({
      ...counts,
      [medication.status]: counts[medication.status] + 1,
    }),
    { active: 0, inactive: 0, discontinued: 0 }
  );
}

function MedicationRow({
  medication,
  canManage,
  onEdit,
  onDiscontinue,
}: {
  medication: PatientMedication;
  canManage: boolean;
  onEdit: (medication: PatientMedication) => void;
  onDiscontinue: (medication: PatientMedication) => void;
}) {
  const isDiscontinued = medication.status === "discontinued";

  return (
    <div className="border-b border-cf-border px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-cf-text">
              {medication.medication_name}
            </span>
            <Badge variant={statusBadgeVariant[medication.status]}>
              {medication.status_label || getStatusLabel(medication.status)}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-cf-text-muted">
            {[medication.dose, medication.route, medication.frequency]
              .filter(Boolean)
              .join(" - ")}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-cf-text-subtle">
            <span>{getDateRange(medication)}</span>
            {medication.prescriber_name ? (
              <span>Prescriber: {medication.prescriber_name}</span>
            ) : null}
          </div>
          {medication.notes ? (
            <div className="mt-2 line-clamp-2 text-sm text-cf-text-muted">
              {medication.notes}
            </div>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => onEdit(medication)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant={isDiscontinued ? "default" : "warning"}
              onClick={() => onDiscontinue(medication)}
              disabled={isDiscontinued}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discontinue
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PatientMedicationsTab({
  facilityId,
  patientId,
  canManage = true,
}: PatientMedicationsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] =
    useState<PatientMedication | null>(null);
  const [confirmMedication, setConfirmMedication] =
    useState<PatientMedication | null>(null);
  const {
    medications,
    medicationsQuery,
    createMedicationMutation,
    updateMedicationMutation,
    discontinueMedicationMutation,
  } = usePatientMedications({ facilityId, patientId });

  const sortedMedications = useMemo(
    () => sortMedications(medications),
    [medications]
  );
  const counts = useMemo(() => countStatuses(medications), [medications]);
  const isSaving =
    createMedicationMutation.isPending || updateMedicationMutation.isPending;
  const canShowForm = canManage && patientId;
  const mutationError =
    createMedicationMutation.error ||
    updateMedicationMutation.error ||
    discontinueMedicationMutation.error;

  const openCreateForm = () => {
    setEditingMedication(null);
    setShowForm(true);
  };

  const openEditForm = (medication: PatientMedication) => {
    setEditingMedication(medication);
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingMedication(null);
    setShowForm(false);
  };

  const handleSubmit = async (values: MedicationPayload) => {
    if (!patientId) return;

    try {
      if (editingMedication) {
        await updateMedicationMutation.mutateAsync({
          medicationId: editingMedication.id,
          values,
        });
      } else {
        await createMedicationMutation.mutateAsync(values);
      }
      closeForm();
    } catch {
      // The mutation error renders in the tab body.
    }
  };

  const handleDiscontinue = async () => {
    if (!confirmMedication) return;

    try {
      await discontinueMedicationMutation.mutateAsync(confirmMedication.id);
      setConfirmMedication(null);
    } catch {
      // The mutation error renders in the tab body.
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
          <Pill className="h-4 w-4 text-cf-text-subtle" />
          Medications
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">{counts.active} active</Badge>
          <Badge variant="warning">{counts.inactive} inactive</Badge>
          <Badge variant="muted">{counts.discontinued} discontinued</Badge>
          {canManage ? (
            <Button
              size="sm"
              variant="primary"
              onClick={openCreateForm}
              disabled={!canShowForm || showForm}
            >
              <Plus className="h-4 w-4" />
              Add Medication
            </Button>
          ) : null}
        </div>
      </div>

      {showForm && patientId ? (
        <MedicationForm
          patientId={patientId}
          medication={editingMedication}
          saving={isSaving}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      ) : null}

      {mutationError ? (
        <Notice tone="danger" title="Medication update failed">
          Check the medication details and try again.
        </Notice>
      ) : null}

      {medicationsQuery.isLoading ? null : medicationsQuery.error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-cf-text">
              Couldn&apos;t load medications
            </div>
            <div className="text-sm text-cf-text-muted">
              Check your connection and try again.
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => medicationsQuery.refetch()}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : sortedMedications.length ? (
        <div className="overflow-hidden rounded-xl border border-cf-border bg-cf-surface">
          {sortedMedications.map((medication) => (
            <MedicationRow
              key={medication.id}
              medication={medication}
              canManage={canManage}
              onEdit={openEditForm}
              onDiscontinue={setConfirmMedication}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-6 text-center text-sm text-cf-text-muted">
          No medications recorded.
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmMedication)}
        title="Discontinue Medication"
        message={
          confirmMedication
            ? `Mark ${confirmMedication.medication_name} as discontinued?`
            : "Mark this medication as discontinued?"
        }
        confirmText="Discontinue"
        variant="warning"
        onCancel={() => setConfirmMedication(null)}
        onConfirm={handleDiscontinue}
      />
    </section>
  );
}
