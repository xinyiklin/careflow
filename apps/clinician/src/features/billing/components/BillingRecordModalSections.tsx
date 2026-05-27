import { Plus, Trash2 } from "lucide-react";

import { Button, Input } from "../../../shared/components/ui";

import type { Dispatch, SetStateAction } from "react";
import type { FeeScheduleItem } from "../types";

export type DiagnosisRow = {
  code: string;
  description: string;
};

export type ChargeLineRow = {
  service_code: string;
  description: string;
  modifier_1: string;
  modifier_2: string;
  modifier_3: string;
  modifier_4: string;
  units: string;
  charge_amount: string;
  diagnosis_pointers: string;
};

export const blankDiagnosis: DiagnosisRow = {
  code: "",
  description: "",
};

export const blankChargeLine: ChargeLineRow = {
  service_code: "",
  description: "",
  modifier_1: "",
  modifier_2: "",
  modifier_3: "",
  modifier_4: "",
  units: "1.00",
  charge_amount: "0.00",
  diagnosis_pointers: "1",
};

/* ---------- helpers ---------- */

function computeLineTotal(units: string, charge: string) {
  const u = Number.parseFloat(units || "0");
  const c = Number.parseFloat(charge || "0");
  if (!Number.isFinite(u) || !Number.isFinite(c)) return "0.00";
  return (u * c).toFixed(2);
}

/* ---------- BillingDiagnosisEditor ---------- */

export function BillingDiagnosisEditor({
  diagnoses,
  saving,
  setDiagnoses,
  setDiagnosisField,
}: {
  diagnoses: DiagnosisRow[];
  saving: boolean;
  setDiagnoses: Dispatch<SetStateAction<DiagnosisRow[]>>;
  setDiagnosisField: (
    index: number,
    field: keyof DiagnosisRow,
    value: string
  ) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-cf-text">Diagnoses</div>
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() =>
            setDiagnoses((current) => [...current, { ...blankDiagnosis }])
          }
          disabled={saving}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {diagnoses.map((diagnosis, index) => (
          <div
            key={index}
            className="grid gap-2 border-t border-cf-border pt-3 md:grid-cols-[auto_120px_minmax(0,1fr)_auto]"
          >
            <div className="flex h-9 w-7 items-center justify-center text-xs font-semibold text-cf-text-subtle">
              {index + 1}.
            </div>
            <Input
              aria-label={`Diagnosis ${index + 1} code`}
              value={diagnosis.code}
              placeholder="ICD-10"
              onChange={(event) =>
                setDiagnosisField(index, "code", event.target.value)
              }
              disabled={saving}
            />
            <Input
              aria-label={`Diagnosis ${index + 1} description`}
              value={diagnosis.description}
              placeholder="Description"
              onChange={(event) =>
                setDiagnosisField(index, "description", event.target.value)
              }
              disabled={saving}
            />
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-9 w-9 px-0"
              aria-label={`Remove diagnosis ${index + 1}`}
              onClick={() =>
                setDiagnoses((current) =>
                  current.length > 1
                    ? current.filter((_, rowIndex) => rowIndex !== index)
                    : [{ ...blankDiagnosis }]
                )
              }
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- BillingServiceLineEditor ---------- */

export function BillingServiceLineEditor({
  chargeLines,
  saving,
  diagnoses,
  feeScheduleItems = [],
  setChargeLines,
  setChargeLineField,
}: {
  chargeLines: ChargeLineRow[];
  saving: boolean;
  diagnoses?: DiagnosisRow[];
  feeScheduleItems?: FeeScheduleItem[];
  setChargeLines: Dispatch<SetStateAction<ChargeLineRow[]>>;
  setChargeLineField: (
    index: number,
    field: keyof ChargeLineRow,
    value: string
  ) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-cf-text">Service Lines</div>
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() =>
            setChargeLines((current) => [...current, { ...blankChargeLine }])
          }
          disabled={saving}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      {feeScheduleItems.length ? (
        <datalist id="billing-fee-schedule-codes">
          {feeScheduleItems.map((item) => (
            <option
              key={item.id}
              value={item.service_code}
              label={`${item.description || "Service"} - $${Number(
                item.charge_amount || 0
              ).toFixed(2)}`}
            />
          ))}
        </datalist>
      ) : null}
      <div className="space-y-3">
        {chargeLines.map((line, index) => {
          const lineTotal = computeLineTotal(line.units, line.charge_amount);

          return (
            <div key={index} className="border-t border-cf-border pt-3">
              {/* Main row: CPT + Description + Units + Charge + Total + Remove */}
              <div className="grid gap-2 md:grid-cols-[110px_minmax(0,1fr)_80px_90px_80px_auto]">
                <Input
                  aria-label={`Service line ${index + 1} code`}
                  list="billing-fee-schedule-codes"
                  value={line.service_code}
                  placeholder="CPT"
                  onChange={(event) =>
                    setChargeLineField(
                      index,
                      "service_code",
                      event.target.value
                    )
                  }
                  disabled={saving}
                />
                <Input
                  aria-label={`Service line ${index + 1} description`}
                  value={line.description}
                  placeholder="Description"
                  onChange={(event) =>
                    setChargeLineField(index, "description", event.target.value)
                  }
                  disabled={saving}
                />
                <Input
                  aria-label={`Service line ${index + 1} units`}
                  value={line.units}
                  placeholder="Units"
                  onChange={(event) =>
                    setChargeLineField(index, "units", event.target.value)
                  }
                  disabled={saving}
                />
                <Input
                  aria-label={`Service line ${index + 1} charge`}
                  value={line.charge_amount}
                  placeholder="Charge"
                  onChange={(event) =>
                    setChargeLineField(
                      index,
                      "charge_amount",
                      event.target.value
                    )
                  }
                  disabled={saving}
                />
                <div className="flex h-9 items-center justify-end text-xs font-semibold tabular-nums text-cf-text-muted">
                  ${lineTotal}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-9 w-9 px-0"
                  aria-label={`Remove service line ${index + 1}`}
                  onClick={() =>
                    setChargeLines((current) =>
                      current.length > 1
                        ? current.filter((_, rowIndex) => rowIndex !== index)
                        : [{ ...blankChargeLine }]
                    )
                  }
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Secondary row: Modifiers + Dx Pointers */}
              <div className="mt-2 grid gap-2 md:grid-cols-[repeat(4,60px)_minmax(0,1fr)]">
                <Input
                  aria-label={`Service line ${index + 1} modifier 1`}
                  value={line.modifier_1}
                  placeholder="M1"
                  onChange={(event) =>
                    setChargeLineField(index, "modifier_1", event.target.value)
                  }
                  disabled={saving}
                />
                <Input
                  aria-label={`Service line ${index + 1} modifier 2`}
                  value={line.modifier_2}
                  placeholder="M2"
                  onChange={(event) =>
                    setChargeLineField(index, "modifier_2", event.target.value)
                  }
                  disabled={saving}
                />
                <Input
                  aria-label={`Service line ${index + 1} modifier 3`}
                  value={line.modifier_3}
                  placeholder="M3"
                  onChange={(event) =>
                    setChargeLineField(index, "modifier_3", event.target.value)
                  }
                  disabled={saving}
                />
                <Input
                  aria-label={`Service line ${index + 1} modifier 4`}
                  value={line.modifier_4}
                  placeholder="M4"
                  onChange={(event) =>
                    setChargeLineField(index, "modifier_4", event.target.value)
                  }
                  disabled={saving}
                />
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Service line ${index + 1} diagnosis pointers`}
                    value={line.diagnosis_pointers}
                    placeholder="Dx pointers (e.g. 1, 2)"
                    onChange={(event) =>
                      setChargeLineField(
                        index,
                        "diagnosis_pointers",
                        event.target.value
                      )
                    }
                    disabled={saving}
                  />
                  {diagnoses ? (
                    <DiagnosisPointerLabels
                      pointers={line.diagnosis_pointers}
                      diagnoses={diagnoses}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- DiagnosisPointerLabels ---------- */

function DiagnosisPointerLabels({
  pointers,
  diagnoses,
}: {
  pointers: string;
  diagnoses: DiagnosisRow[];
}) {
  const labels = pointers
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const idx = Number.parseInt(p, 10) - 1;
      const dx = diagnoses[idx];
      return dx?.code ? dx.code : null;
    })
    .filter(Boolean);

  if (!labels.length) return null;

  return (
    <span className="shrink-0 truncate text-[10px] text-cf-text-subtle">
      → {labels.join(", ")}
    </span>
  );
}
