import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  Badge,
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";

import type { FormEvent, ReactNode } from "react";
import type {
  PatientAllergy,
  PatientAllergyCategory,
  PatientAllergyPayload,
  PatientAllergySeverity,
  PatientAllergyStatus,
} from "../api/allergies";
import type { FieldErrors } from "../../../shared/utils/errors";

const CATEGORY_OPTIONS: Array<{
  value: PatientAllergyCategory;
  label: string;
}> = [
  { value: "medication", label: "Medication" },
  { value: "food", label: "Food" },
  { value: "environmental", label: "Environmental" },
  { value: "latex", label: "Latex" },
  { value: "contrast", label: "Contrast" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: Array<{
  value: PatientAllergySeverity;
  label: string;
}> = [
  { value: "unknown", label: "Unknown" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "life_threatening", label: "Life Threatening" },
];

const STATUS_OPTIONS: Array<{ value: PatientAllergyStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "resolved", label: "Resolved" },
  { value: "entered_in_error", label: "Entered in Error" },
];

type AllergyFormValues = Omit<PatientAllergyPayload, "patient">;

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

type PatientAllergyModalProps = {
  isOpen: boolean;
  patientId: number;
  allergy?: PatientAllergy | null;
  saving?: boolean;
  canManage: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  onClose?: () => void;
  onSubmit?: (values: PatientAllergyPayload) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
};

const defaultValues: AllergyFormValues = {
  allergen: "",
  category: "medication",
  reaction: "",
  severity: "unknown",
  onset_date: null,
  status: "active",
  notes: "",
};

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-cf-danger-text">{error}</span>
      ) : null}
    </label>
  );
}

function toFormValues(allergy?: PatientAllergy | null): AllergyFormValues {
  return {
    allergen: allergy?.allergen || "",
    category: allergy?.category || "medication",
    reaction: allergy?.reaction || "",
    severity: allergy?.severity || "unknown",
    onset_date: allergy?.onset_date || null,
    status: allergy?.status || "active",
    notes: allergy?.notes || "",
  };
}

export default function PatientAllergyModal({
  isOpen,
  patientId,
  allergy = null,
  saving = false,
  canManage,
  error = "",
  fieldErrors = {},
  onClose,
  onSubmit,
  onDelete,
}: PatientAllergyModalProps) {
  const [values, setValues] = useState<AllergyFormValues>(defaultValues);
  const isEditing = Boolean(allergy?.id);
  const formId = "patient-allergy-form";

  useEffect(() => {
    if (!isOpen) return;
    setValues(toFormValues(allergy));
  }, [allergy, isOpen]);

  const setValue = <TKey extends keyof AllergyFormValues>(
    key: TKey,
    value: AllergyFormValues[TKey]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || saving) return;

    onSubmit?.({
      patient: patientId,
      allergen: values.allergen.trim(),
      category: values.category,
      reaction: values.reaction.trim(),
      severity: values.severity,
      onset_date: values.onset_date || null,
      status: values.status,
      notes: values.notes.trim(),
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Allergy"
      maxWidth="2xl"
      bodyClassName="p-0"
      footerClassName="bg-cf-surface !py-3"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div>
            {isEditing && canManage ? (
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={saving}
              >
                Mark Entered in Error
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              disabled={!canManage || saving}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Allergy"}
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 border-b border-cf-border pb-3">
          <AlertTriangle className="h-4 w-4 text-cf-warning-text" />
          <Badge variant={values.status === "active" ? "warning" : "muted"}>
            {
              STATUS_OPTIONS.find((option) => option.value === values.status)
                ?.label
            }
          </Badge>
          <span className="text-sm font-semibold text-cf-text">
            {values.allergen || "New allergy"}
          </span>
        </div>

        {error ? (
          <Notice tone="danger" title="Couldn't save allergy">
            {error}
          </Notice>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Allergen" error={fieldErrors.allergen}>
            <Input
              value={values.allergen}
              onChange={(event) => setValue("allergen", event.target.value)}
              disabled={!canManage || saving}
              required
            />
          </Field>
          <Field label="Category" error={fieldErrors.category}>
            <Input
              as="select"
              value={values.category}
              onChange={(event) =>
                setValue(
                  "category",
                  event.target.value as PatientAllergyCategory
                )
              }
              disabled={!canManage || saving}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          </Field>
          <Field label="Severity" error={fieldErrors.severity}>
            <Input
              as="select"
              value={values.severity}
              onChange={(event) =>
                setValue(
                  "severity",
                  event.target.value as PatientAllergySeverity
                )
              }
              disabled={!canManage || saving}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          </Field>
          <Field label="Status" error={fieldErrors.status}>
            <Input
              as="select"
              value={values.status}
              onChange={(event) =>
                setValue("status", event.target.value as PatientAllergyStatus)
              }
              disabled={!canManage || saving}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          </Field>
          <Field label="Onset Date" error={fieldErrors.onset_date}>
            <Input
              type="date"
              value={values.onset_date || ""}
              onChange={(event) =>
                setValue("onset_date", event.target.value || null)
              }
              disabled={!canManage || saving}
            />
          </Field>
        </div>

        <Field label="Reaction" error={fieldErrors.reaction}>
          <Input
            as="textarea"
            value={values.reaction}
            rows={3}
            onChange={(event) => setValue("reaction", event.target.value)}
            disabled={!canManage || saving}
            required
          />
        </Field>

        <Field label="Notes" error={fieldErrors.notes}>
          <Input
            as="textarea"
            value={values.notes}
            rows={3}
            onChange={(event) => setValue("notes", event.target.value)}
            disabled={!canManage || saving}
          />
        </Field>
      </form>
    </ModalShell>
  );
}
