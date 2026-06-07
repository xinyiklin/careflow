import { useTranslation } from "react-i18next";

import type { PortalSummaryVitals } from "../api/medicalSummary";

type Field = { labelKey: string; value: string };

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
    ["records.vitalBloodPressure", bp],
    ["records.vitalHeartRate", format(vitals.heart_rate_bpm, "bpm")],
    ["records.vitalRespiratoryRate", format(vitals.respiratory_rate, "/min")],
    ["records.vitalTemperature", format(vitals.temperature_c, "°C")],
    ["records.vitalSpo2", format(vitals.spo2_percent, "%")],
    [
      "records.vitalPain",
      vitals.pain_score === null ? null : `${vitals.pain_score} / 10`,
    ],
    ["records.vitalHeight", format(vitals.height_cm, "cm")],
    ["records.vitalWeight", format(vitals.weight_kg, "kg")],
    ["records.vitalBmi", vitals.bmi ? `${vitals.bmi}` : null],
  ];

  return rows
    .filter(([, value]) => value !== null)
    .map(([labelKey, value]) => ({ labelKey, value: value as string }));
}

export function VitalsGrid({ vitals }: { vitals: PortalSummaryVitals }) {
  const { t } = useTranslation();
  const fields = buildFields(vitals);
  if (fields.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {fields.map((field) => (
        <div key={field.labelKey}>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-subtle">
            {t(field.labelKey)}
          </dt>
          <dd className="mt-0.5 text-sm text-text">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
