import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

import {
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";

import type { ChangeEvent, FormEvent } from "react";
import type {
  ClinicalEncounter,
  ClinicalVitals,
  ClinicalVitalsFormValues,
} from "../../billing/types";

type VitalsIntakeModalProps = {
  /**
   * Open guard — caller flips this to ``true`` only after the existing
   * vitals (if any) have finished loading. The modal does not render
   * any chrome while ``isOpen`` is false, so there's no flicker.
   */
  isOpen: boolean;
  encounter: ClinicalEncounter | null;
  /** Existing vitals row for this encounter, or null if none recorded yet. */
  vitals: ClinicalVitals | null;
  saving?: boolean;
  error?: string;
  patientName?: string;
  onClose: () => void;
  onSubmit: (values: ClinicalVitalsFormValues) => void | Promise<void>;
};

const EMPTY_FORM: ClinicalVitalsFormValues = {
  height_cm: "",
  weight_kg: "",
  bp_systolic: "",
  bp_diastolic: "",
  heart_rate_bpm: "",
  respiratory_rate: "",
  temperature_c: "",
  spo2_percent: "",
  pain_score: "",
  notes: "",
};

function toFormString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function vitalsToForm(vitals: ClinicalVitals | null): ClinicalVitalsFormValues {
  if (!vitals) return { ...EMPTY_FORM };
  return {
    height_cm: toFormString(vitals.height_cm),
    weight_kg: toFormString(vitals.weight_kg),
    bp_systolic: toFormString(vitals.bp_systolic),
    bp_diastolic: toFormString(vitals.bp_diastolic),
    heart_rate_bpm: toFormString(vitals.heart_rate_bpm),
    respiratory_rate: toFormString(vitals.respiratory_rate),
    temperature_c: toFormString(vitals.temperature_c),
    spo2_percent: toFormString(vitals.spo2_percent),
    pain_score: toFormString(vitals.pain_score),
    notes: vitals.notes ?? "",
  };
}

function computeBmi(heightCm: string, weightKg: string): string | null {
  const h = Number.parseFloat(heightCm);
  const w = Number.parseFloat(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) {
    return null;
  }
  const heightM = h / 100;
  const bmi = w / (heightM * heightM);
  return bmi.toFixed(1);
}

export default function VitalsIntakeModal({
  isOpen,
  encounter,
  vitals,
  saving = false,
  error = "",
  patientName,
  onClose,
  onSubmit,
}: VitalsIntakeModalProps) {
  const [formData, setFormData] =
    useState<ClinicalVitalsFormValues>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(vitalsToForm(vitals));
  }, [isOpen, vitals]);

  // Open guard — only render once a real encounter is in scope. Without
  // this the modal can flash blank state while the parent resolves the
  // encounter's vitals.
  if (!isOpen || !encounter) return null;

  const isSigned = encounter.status === "signed";
  const readOnly = isSigned;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly) return;
    onSubmit(formData);
  };

  const computedBmi = computeBmi(formData.height_cm, formData.weight_kg);
  const lockedNotice = readOnly
    ? "This encounter is signed; vitals are read-only."
    : "";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cf-accent" />
          <span>Vitals intake{patientName ? ` — ${patientName}` : ""}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={saving}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly ? (
            <Button
              variant="primary"
              type="submit"
              form="vitals-intake-form"
              disabled={saving}
            >
              {saving ? "Saving..." : vitals ? "Update vitals" : "Save vitals"}
            </Button>
          ) : null}
        </div>
      }
    >
      <form
        id="vitals-intake-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {lockedNotice ? <Notice tone="info">{lockedNotice}</Notice> : null}

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            Body measurements
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <VitalsField
              label="Height (cm)"
              name="height_cm"
              value={formData.height_cm}
              type="number"
              step="0.1"
              min="20"
              max="260"
              disabled={readOnly}
              onChange={handleChange}
            />
            <VitalsField
              label="Weight (kg)"
              name="weight_kg"
              value={formData.weight_kg}
              type="number"
              step="0.01"
              min="0.5"
              max="500"
              disabled={readOnly}
              onChange={handleChange}
            />
            <div>
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                BMI (computed)
              </span>
              <div className="flex h-9 items-center rounded-xl border border-cf-border bg-cf-surface-soft px-3 text-sm text-cf-text">
                {computedBmi ?? "—"}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            Cardiovascular & respiratory
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <VitalsField
              label="BP systolic (mmHg)"
              name="bp_systolic"
              value={formData.bp_systolic}
              type="number"
              min="50"
              max="260"
              disabled={readOnly}
              onChange={handleChange}
            />
            <VitalsField
              label="BP diastolic (mmHg)"
              name="bp_diastolic"
              value={formData.bp_diastolic}
              type="number"
              min="30"
              max="180"
              disabled={readOnly}
              onChange={handleChange}
            />
            <VitalsField
              label="Heart rate (bpm)"
              name="heart_rate_bpm"
              value={formData.heart_rate_bpm}
              type="number"
              min="20"
              max="260"
              disabled={readOnly}
              onChange={handleChange}
            />
            <VitalsField
              label="Resp rate (/min)"
              name="respiratory_rate"
              value={formData.respiratory_rate}
              type="number"
              min="4"
              max="80"
              disabled={readOnly}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            Other observations
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <VitalsField
              label="Temperature (°C)"
              name="temperature_c"
              value={formData.temperature_c}
              type="number"
              step="0.1"
              min="25"
              max="45"
              disabled={readOnly}
              onChange={handleChange}
            />
            <VitalsField
              label="SpO₂ (%)"
              name="spo2_percent"
              value={formData.spo2_percent}
              type="number"
              min="50"
              max="100"
              disabled={readOnly}
              onChange={handleChange}
            />
            <VitalsField
              label="Pain (0-10)"
              name="pain_score"
              value={formData.pain_score}
              type="number"
              min="0"
              max="10"
              disabled={readOnly}
              onChange={handleChange}
            />
          </div>
        </section>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
            Notes (optional)
          </span>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            disabled={readOnly}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-cf-border-strong bg-cf-surface px-3 py-2 text-sm text-cf-text shadow-sm outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        {vitals?.recorded_by_name ? (
          <p className="text-[11px] text-cf-text-subtle">
            Last recorded by {vitals.recorded_by_name}
            {vitals.measured_at
              ? ` · ${new Date(vitals.measured_at).toLocaleString()}`
              : ""}
          </p>
        ) : null}
      </form>
    </ModalShell>
  );
}

function VitalsField({
  label,
  name,
  value,
  type = "number",
  step,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
        {label}
      </span>
      <Input
        type={type}
        name={name}
        value={value}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={onChange}
        inputMode="decimal"
      />
    </label>
  );
}
