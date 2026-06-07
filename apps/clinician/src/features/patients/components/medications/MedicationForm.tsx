import { useEffect, useState } from "react";

import { Button, Input } from "../../../../shared/components/ui";

import type { FormEvent } from "react";
import type { EntityId } from "../../../../shared/api/types";
import type {
  MedicationPayload,
  MedicationStatus,
  PatientMedication,
} from "../../api/medications";

type MedicationFormValues = {
  status: MedicationStatus;
  medication_name: string;
  dose: string;
  route: string;
  frequency: string;
  start_date: string;
  end_date: string;
  prescriber_name: string;
  notes: string;
};

type MedicationFormProps = {
  patientId: EntityId;
  medication?: PatientMedication | null;
  saving?: boolean;
  onCancel?: () => void;
  onSubmit?: (values: MedicationPayload) => Promise<void> | void;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "discontinued", label: "Discontinued" },
] as const satisfies ReadonlyArray<{
  value: MedicationStatus;
  label: string;
}>;

const emptyValues: MedicationFormValues = {
  status: "active",
  medication_name: "",
  dose: "",
  route: "",
  frequency: "",
  start_date: "",
  end_date: "",
  prescriber_name: "",
  notes: "",
};

function valuesFromMedication(
  medication?: PatientMedication | null
): MedicationFormValues {
  if (!medication) return emptyValues;

  return {
    status: medication.status || "active",
    medication_name: medication.medication_name || "",
    dose: medication.dose || "",
    route: medication.route || "",
    frequency: medication.frequency || "",
    start_date: medication.start_date || "",
    end_date: medication.end_date || "",
    prescriber_name: medication.prescriber_name || "",
    notes: medication.notes || "",
  };
}

function FieldLabel({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-cf-text-subtle">
      {children}
      {required ? <span className="ml-1 text-cf-danger-text">*</span> : null}
    </label>
  );
}

export default function MedicationForm({
  patientId,
  medication = null,
  saving = false,
  onCancel,
  onSubmit,
}: MedicationFormProps) {
  const [values, setValues] = useState<MedicationFormValues>(
    valuesFromMedication(medication)
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(valuesFromMedication(medication));
    setError("");
  }, [medication]);

  const isEditing = Boolean(medication);

  const updateValue = <TKey extends keyof MedicationFormValues>(
    key: TKey,
    value: MedicationFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const medicationName = values.medication_name.trim();
    const dose = values.dose.trim();
    const route = values.route.trim();
    const frequency = values.frequency.trim();

    if (!medicationName || !dose || !route || !frequency) {
      setError("Medication name, dose, route, and frequency are required.");
      return;
    }

    if (
      values.start_date &&
      values.end_date &&
      values.end_date < values.start_date
    ) {
      setError("End date cannot be before start date.");
      return;
    }

    onSubmit?.({
      patient: Number(patientId),
      status: values.status,
      medication_name: medicationName,
      dose,
      route,
      frequency,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      prescriber_name: values.prescriber_name.trim(),
      notes: values.notes.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border-b border-cf-border bg-cf-surface-muted/35 px-4 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-cf-text">
            {isEditing ? "Edit Medication" : "Add Medication"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="primary" disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save" : "Add"}
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="text-sm font-medium text-cf-danger-text">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <FieldLabel required>Medication</FieldLabel>
          <Input
            value={values.medication_name}
            onChange={(event) =>
              updateValue("medication_name", event.target.value)
            }
            disabled={saving}
          />
        </div>

        <div>
          <FieldLabel required>Dose</FieldLabel>
          <Input
            value={values.dose}
            onChange={(event) => updateValue("dose", event.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <FieldLabel required>Route</FieldLabel>
          <Input
            value={values.route}
            onChange={(event) => updateValue("route", event.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <FieldLabel required>Frequency</FieldLabel>
          <Input
            value={values.frequency}
            onChange={(event) => updateValue("frequency", event.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <FieldLabel>Status</FieldLabel>
          <Input
            as="select"
            value={values.status}
            onChange={(event) =>
              updateValue("status", event.target.value as MedicationStatus)
            }
            disabled={saving}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Input>
        </div>

        <div>
          <FieldLabel>Start Date</FieldLabel>
          <Input
            type="date"
            value={values.start_date}
            onChange={(event) => updateValue("start_date", event.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <FieldLabel>End Date</FieldLabel>
          <Input
            type="date"
            value={values.end_date}
            onChange={(event) => updateValue("end_date", event.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <FieldLabel>Prescriber</FieldLabel>
          <Input
            value={values.prescriber_name}
            onChange={(event) =>
              updateValue("prescriber_name", event.target.value)
            }
            disabled={saving}
          />
        </div>

        <div className="md:col-span-2 xl:col-span-4">
          <FieldLabel>Notes</FieldLabel>
          <Input
            as="textarea"
            rows={2}
            className="min-h-20 resize-none"
            value={values.notes}
            onChange={(event) => updateValue("notes", event.target.value)}
            disabled={saving}
          />
        </div>
      </div>
    </form>
  );
}
