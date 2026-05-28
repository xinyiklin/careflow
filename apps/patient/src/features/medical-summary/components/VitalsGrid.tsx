import type { PortalSummaryVitals } from "../api/medicalSummary";

type Field = { label: string; value: string };

function format(value: string | number | null, unit: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  return `${value} ${unit}`;
}

function buildFields(vitals: PortalSummaryVitals): Field[] {
  const bp =
    vitals.bp_systolic && vitals.bp_diastolic
      ? `${vitals.bp_systolic} / ${vitals.bp_diastolic} mmHg`
      : null;

  const rows: Array<[string, string | null]> = [
    ["Blood pressure", bp],
    ["Heart rate", format(vitals.heart_rate_bpm, "bpm")],
    ["Respiratory rate", format(vitals.respiratory_rate, "/min")],
    ["Temperature", format(vitals.temperature_c, "°C")],
    ["SpO2", format(vitals.spo2_percent, "%")],
    ["Pain", vitals.pain_score === null ? null : `${vitals.pain_score} / 10`],
    ["Height", format(vitals.height_cm, "cm")],
    ["Weight", format(vitals.weight_kg, "kg")],
    ["BMI", vitals.bmi ? `${vitals.bmi}` : null],
  ];

  return rows
    .filter(([, value]) => value !== null)
    .map(([label, value]) => ({ label, value: value as string }));
}

export function VitalsGrid({ vitals }: { vitals: PortalSummaryVitals }) {
  const fields = buildFields(vitals);
  if (fields.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-subtle">
            {field.label}
          </dt>
          <dd className="mt-0.5 text-sm text-text">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
