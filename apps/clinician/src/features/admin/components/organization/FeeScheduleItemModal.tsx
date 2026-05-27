import { type FormEvent, useState } from "react";
import { DollarSign, Hash } from "lucide-react";

import { Input } from "../../../../shared/components/ui";
import { AdminFormModal } from "../shared/AdminFormModal";
import {
  CompactCard,
  CompactField,
  CompactMetric,
  CompactModalGrid,
  CompactModalLane,
  CompactPill,
  CompactRecordHeader,
  CompactToggle,
} from "../shared/AdminCompactModal";

export type FeeScheduleItemFormData = {
  schedule: string;
  service_code: string;
  description: string;
  default_units: string;
  charge_amount: string;
  modifier_1: string;
  modifier_2: string;
  modifier_3: string;
  modifier_4: string;
  place_of_service: string;
  is_active: boolean;
  sort_order: string;
};

export const EMPTY_ITEM_FORM: FeeScheduleItemFormData = {
  schedule: "",
  service_code: "",
  description: "",
  default_units: "1.00",
  charge_amount: "0.00",
  modifier_1: "",
  modifier_2: "",
  modifier_3: "",
  modifier_4: "",
  place_of_service: "11",
  is_active: true,
  sort_order: "0",
};

function formatCurrency(value: string) {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "$0.00";
}

function getModifierSummary(form: FeeScheduleItemFormData) {
  const mods = [
    form.modifier_1,
    form.modifier_2,
    form.modifier_3,
    form.modifier_4,
  ].filter(Boolean);
  return mods.length ? mods.join(", ") : "None";
}

export default function FeeScheduleItemModal({
  isOpen,
  isEditing,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}: {
  isOpen: boolean;
  isEditing: boolean;
  form: FeeScheduleItemFormData;
  saving: boolean;
  onClose: () => void;
  onChange: (name: string, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [showModifiers, setShowModifiers] = useState(false);
  const hasModifiers = !!(
    form.modifier_1 ||
    form.modifier_2 ||
    form.modifier_3 ||
    form.modifier_4
  );

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Fee schedule"
      title={isEditing ? "Edit Fee" : "Add Fee"}
      formId="organization-fee-schedule-form"
      saving={saving}
      maxWidth="3xl"
    >
      <form
        id="organization-fee-schedule-form"
        className="space-y-4"
        onSubmit={onSubmit}
      >
        <CompactModalGrid>
          <CompactModalLane>
            <CompactCard>
              <CompactRecordHeader
                initials={
                  form.service_code
                    ? form.service_code.slice(0, 2).toUpperCase()
                    : "FE"
                }
                title={form.description || "Fee item"}
                meta={`${form.service_code || "No code"} · ${formatCurrency(form.charge_amount)}`}
                action={
                  <CompactToggle
                    label="Active"
                    name="is_active"
                    checked={form.is_active}
                    onChange={(e) => onChange("is_active", e.target.checked)}
                  />
                }
              />
            </CompactCard>

            <CompactCard eyebrow="Service">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="CPT / HCPCS code">
                  <Input
                    value={form.service_code}
                    onChange={(e) =>
                      onChange(
                        "service_code",
                        (e.target as HTMLInputElement).value
                      )
                    }
                    placeholder="e.g. 99213"
                    required
                    disabled={isEditing}
                    className="font-mono"
                  />
                </CompactField>
                <CompactField label="Charge amount">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cf-text-muted">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.charge_amount}
                      onChange={(e) =>
                        onChange(
                          "charge_amount",
                          (e.target as HTMLInputElement).value
                        )
                      }
                      required
                      className="pl-7 font-mono tabular-nums"
                    />
                  </div>
                </CompactField>
                <CompactField label="Description" className="sm:col-span-2">
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      onChange(
                        "description",
                        (e.target as HTMLInputElement).value
                      )
                    }
                    placeholder="Service description"
                    required
                  />
                </CompactField>
              </div>
            </CompactCard>

            <CompactCard eyebrow="Billing">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="Default units">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.default_units}
                    onChange={(e) =>
                      onChange(
                        "default_units",
                        (e.target as HTMLInputElement).value
                      )
                    }
                    className="font-mono tabular-nums"
                  />
                </CompactField>
                <CompactField label="Place of service">
                  <Input
                    maxLength={2}
                    value={form.place_of_service}
                    onChange={(e) =>
                      onChange(
                        "place_of_service",
                        (e.target as HTMLInputElement).value
                      )
                    }
                    placeholder="11"
                    className="font-mono"
                  />
                </CompactField>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-cf-accent hover:text-cf-accent/80 transition-colors"
                  onClick={() => setShowModifiers(!showModifiers)}
                >
                  {showModifiers
                    ? "Hide modifiers"
                    : hasModifiers
                      ? "Edit modifiers"
                      : "Add modifiers"}
                </button>

                {showModifiers && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <CompactField label="Mod 1">
                      <Input
                        maxLength={2}
                        value={form.modifier_1}
                        onChange={(e) =>
                          onChange(
                            "modifier_1",
                            (e.target as HTMLInputElement).value
                          )
                        }
                        placeholder="—"
                        className="font-mono uppercase text-center"
                      />
                    </CompactField>
                    <CompactField label="Mod 2">
                      <Input
                        maxLength={2}
                        value={form.modifier_2}
                        onChange={(e) =>
                          onChange(
                            "modifier_2",
                            (e.target as HTMLInputElement).value
                          )
                        }
                        placeholder="—"
                        className="font-mono uppercase text-center"
                      />
                    </CompactField>
                    <CompactField label="Mod 3">
                      <Input
                        maxLength={2}
                        value={form.modifier_3}
                        onChange={(e) =>
                          onChange(
                            "modifier_3",
                            (e.target as HTMLInputElement).value
                          )
                        }
                        placeholder="—"
                        className="font-mono uppercase text-center"
                      />
                    </CompactField>
                    <CompactField label="Mod 4">
                      <Input
                        maxLength={2}
                        value={form.modifier_4}
                        onChange={(e) =>
                          onChange(
                            "modifier_4",
                            (e.target as HTMLInputElement).value
                          )
                        }
                        placeholder="—"
                        className="font-mono uppercase text-center"
                      />
                    </CompactField>
                  </div>
                )}
              </div>
            </CompactCard>
          </CompactModalLane>

          <CompactCard
            eyebrow="Preview"
            title="Claim line"
            className="bg-cf-surface-soft/40 border border-cf-border/40 rounded-2xl p-4 shadow-[var(--shadow-panel)]"
          >
            <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cf-accent/12 text-cf-accent">
                      <Hash className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-mono text-sm font-bold text-cf-text">
                      {form.service_code || "—"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-cf-text-muted">
                    {form.description || "No description"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <DollarSign className="h-3.5 w-3.5 text-cf-text-subtle" />
                  <span className="font-mono text-lg font-bold tabular-nums text-cf-text">
                    {Number(form.charge_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cf-border/50 pt-3">
                {hasModifiers && (
                  <span className="rounded-md bg-cf-surface-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-cf-text-muted ring-1 ring-cf-border">
                    {[
                      form.modifier_1,
                      form.modifier_2,
                      form.modifier_3,
                      form.modifier_4,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                <span className="text-[11px] font-medium text-cf-text-subtle">
                  POS {form.place_of_service || "11"}
                </span>
                <span className="text-[11px] font-medium text-cf-text-subtle">
                  {form.default_units} unit
                  {Number(form.default_units) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <CompactMetric
                label="Charge"
                value={formatCurrency(form.charge_amount)}
              />
              <CompactMetric
                label="Units"
                value={form.default_units || "1.00"}
              />
              <CompactMetric
                label="Modifiers"
                value={getModifierSummary(form)}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <CompactPill tone={form.is_active ? "success" : "muted"}>
                {form.is_active ? "Active" : "Inactive"}
              </CompactPill>
              {form.place_of_service && form.place_of_service !== "11" && (
                <CompactPill tone="muted">
                  POS {form.place_of_service}
                </CompactPill>
              )}
            </div>
          </CompactCard>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
