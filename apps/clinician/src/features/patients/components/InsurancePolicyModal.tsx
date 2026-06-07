import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  CreditCard,
  FileText,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { FieldError, FormLabel as Label } from "./PatientFormFields";
import { Button, Input, ModalShell } from "../../../shared/components/ui";
import { getCarrierBranding } from "../utils/insuranceCardBranding";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type {
  InsuranceCarrier,
  InsuranceCoverageOrder,
  InsurancePolicyFormValues,
  InsurancePolicyPayload,
  InsuranceRelationship,
  PatientHubInsurancePolicy,
} from "../types";

const RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "other", label: "Other" },
] as const satisfies ReadonlyArray<{
  value: InsuranceRelationship;
  label: string;
}>;

const COVERAGE_ORDER_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "tertiary", label: "Tertiary" },
  { value: "other", label: "Other" },
] as const satisfies ReadonlyArray<{
  value: InsuranceCoverageOrder;
  label: string;
}>;

const defaultValues: InsurancePolicyFormValues = {
  carrier: "",
  plan_name: "",
  member_id: "",
  group_number: "",
  subscriber_name: "",
  relationship_to_subscriber: "self",
  effective_date: "",
  termination_date: "",
  coverage_order: "primary",
  is_primary: true,
  is_active: true,
  notes: "",
};

type FieldSectionProps = {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
};

type InsurancePolicyModalProps = {
  isOpen: boolean;
  policy?: PatientHubInsurancePolicy | null;
  carriers?: InsuranceCarrier[];
  saving?: boolean;
  onClose?: () => void;
  onSubmit?: (values: InsurancePolicyPayload) => void;
  onDelete?: () => void;
};

function FieldSection({
  icon: Icon,
  title,
  children,
  className = "",
}: FieldSectionProps) {
  return (
    <section className={["min-w-0", className].filter(Boolean).join(" ")}>
      <div className="mb-2 flex items-center gap-2 border-b border-cf-border pb-2">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-cf-text-subtle" />
        ) : null}
        <h3 className="text-sm font-semibold text-cf-text">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function formatPolicyDate(value: string | null | undefined) {
  if (!value) return "—";

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

export default function InsurancePolicyModal({
  isOpen,
  policy = null,
  carriers = [],
  saving = false,
  onClose,
  onSubmit,
  onDelete,
}: InsurancePolicyModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InsurancePolicyFormValues>({
    defaultValues,
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      carrier: policy?.carrier ? String(policy.carrier) : "",
      plan_name: policy?.plan_name || "",
      member_id: policy?.member_id || "",
      group_number: policy?.group_number || "",
      subscriber_name: policy?.subscriber_name || "",
      relationship_to_subscriber: policy?.relationship_to_subscriber || "self",
      effective_date: policy?.effective_date || "",
      termination_date: policy?.termination_date || "",
      coverage_order:
        policy?.coverage_order ||
        (policy?.is_primary ? "primary" : "secondary"),
      is_primary: policy?.is_primary ?? true,
      is_active: policy?.is_active ?? true,
      notes: policy?.notes || "",
    });
  }, [isOpen, policy, reset]);

  const watchedCarrier = watch("carrier");
  const watchedPlanName = watch("plan_name");
  const watchedMemberId = watch("member_id");
  const watchedGroupNumber = watch("group_number");
  const watchedSubscriberName = watch("subscriber_name");
  const watchedRelationship = watch("relationship_to_subscriber");
  const watchedEffectiveDate = watch("effective_date");
  const watchedTerminationDate = watch("termination_date");
  const watchedCoverageOrder = watch("coverage_order");
  const watchedIsActive = watch("is_active");
  const selectedCarrier = carriers.find(
    (carrier) => String(carrier.id) === String(watchedCarrier)
  );
  const selectedRelationship =
    RELATIONSHIP_OPTIONS.find((option) => option.value === watchedRelationship)
      ?.label || "Self";
  const selectedCoverageOrder =
    COVERAGE_ORDER_OPTIONS.find(
      (option) => option.value === watchedCoverageOrder
    )?.label || "Primary";
  const isEditing = Boolean(policy);

  const branding = getCarrierBranding(selectedCarrier?.name);

  const formatMemberId = (id: string) => {
    if (!id) return "•••• •••• ••••";
    return id.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Insurance"
      maxWidth="4xl"
      panelClassName="max-h-[min(94dvh,760px)] max-w-5xl"
      bodyClassName="overflow-hidden p-0"
      footerClassName="bg-cf-surface !py-3"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div>
            {isEditing ? (
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={saving}
              >
                Remove
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="insurance-policy-form"
              variant="primary"
              disabled={saving}
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Policy"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="insurance-policy-form"
        onSubmit={handleSubmit((values) => {
          onSubmit?.({
            carrier: Number(values.carrier),
            plan_name: values.plan_name.trim(),
            member_id: values.member_id.trim(),
            group_number: values.group_number.trim(),
            subscriber_name: values.subscriber_name.trim(),
            relationship_to_subscriber: values.relationship_to_subscriber,
            effective_date: values.effective_date || null,
            termination_date: values.termination_date || null,
            coverage_order: values.coverage_order,
            is_primary: values.coverage_order === "primary",
            is_active: values.is_active,
            notes: values.notes.trim(),
          });
        })}
        className="flex min-h-0 flex-col"
      >
        <div className="shrink-0 border-b border-cf-border bg-cf-surface-muted/50 px-5 py-2 text-xs text-cf-text-subtle">
          Compile and verify the patient's insurance details. Changes update the
          visual card preview in real-time.
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-cf-surface">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
            {/* Form Fields: Left Column */}
            <div className="lg:col-span-7 order-2 lg:order-1 space-y-6">
              <FieldSection icon={ShieldCheck} title="Coverage">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label compact required>
                      Carrier
                    </Label>
                    <Input
                      as="select"
                      {...register("carrier", {
                        required: "Carrier is required.",
                      })}
                    >
                      <option value="">Select carrier</option>
                      {carriers.map((carrier) => (
                        <option key={carrier.id} value={carrier.id}>
                          {carrier.name}
                        </option>
                      ))}
                    </Input>
                    <FieldError error={errors.carrier} />
                  </div>

                  <div>
                    <Label compact>Plan Name</Label>
                    <Input {...register("plan_name")} />
                  </div>

                  <div>
                    <Label compact required>
                      Member ID
                    </Label>
                    <Input
                      {...register("member_id", {
                        required: "Member ID is required.",
                      })}
                    />
                    <FieldError error={errors.member_id} />
                  </div>

                  <div>
                    <Label compact>Group Number</Label>
                    <Input {...register("group_number")} />
                  </div>
                </div>
              </FieldSection>

              <FieldSection icon={UserRoundCheck} title="Subscriber">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label compact>Subscriber Name</Label>
                    <Input {...register("subscriber_name")} />
                  </div>

                  <div>
                    <Label compact>Relationship</Label>
                    <Input
                      as="select"
                      {...register("relationship_to_subscriber")}
                    >
                      {RELATIONSHIP_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Input>
                  </div>
                </div>
              </FieldSection>

              <FieldSection icon={CalendarDays} title="Dates and Status">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label compact>Effective Date</Label>
                    <Input type="date" {...register("effective_date")} />
                  </div>

                  <div>
                    <Label compact>Termination Date</Label>
                    <Input type="date" {...register("termination_date")} />
                  </div>

                  <div className="sm:col-span-2">
                    <Label compact>Coverage Level</Label>
                    <input type="hidden" {...register("coverage_order")} />
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      {COVERAGE_ORDER_OPTIONS.map((option) => {
                        const isSelected =
                          watchedCoverageOrder === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setValue("coverage_order", option.value)
                            }
                            className={[
                              "min-h-9 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                              isSelected
                                ? "border-cf-accent bg-cf-accent text-cf-page-bg shadow-sm"
                                : "border-cf-border bg-cf-surface-soft text-cf-text-muted hover:border-cf-border-strong hover:bg-cf-surface hover:text-cf-text",
                            ].join(" ")}
                            aria-pressed={isSelected}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label compact>Status</Label>
                    <input type="hidden" {...register("is_active")} />
                    <div className="grid gap-2 grid-cols-2 sm:max-w-xs">
                      {[
                        { value: true, label: "Active" },
                        { value: false, label: "Terminated" },
                      ].map((option) => {
                        const isSelected = watchedIsActive === option.value;

                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setValue("is_active", option.value)}
                            className={[
                              "min-h-9 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                              isSelected
                                ? "border-cf-accent bg-cf-accent text-cf-page-bg shadow-sm"
                                : "border-cf-border bg-cf-surface-soft text-cf-text-muted hover:border-cf-border-strong hover:bg-cf-surface hover:text-cf-text",
                            ].join(" ")}
                            aria-pressed={isSelected}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </FieldSection>

              <FieldSection icon={FileText} title="Notes">
                <Input
                  as="textarea"
                  rows={2}
                  className="min-h-20 resize-none"
                  {...register("notes")}
                />
              </FieldSection>
            </div>

            {/* Live Card Preview: Right Column */}
            <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-4 space-y-4 h-fit">
              <div className="text-xs font-semibold uppercase tracking-wider text-cf-text-subtle">
                Live Card Preview
              </div>

              {/* The Live Card */}
              <div
                className={`relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] shadow-lg flex flex-col justify-between aspect-[1.586/1] min-h-[220px] p-6 text-white bg-gradient-to-br ${branding.gradient} transition-all duration-300`}
              >
                {/* Subtle glass sheen overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.04] to-white/[0.08] pointer-events-none" />

                {/* Background watermark monogram */}
                <span
                  className="absolute right-[-4%] bottom-[-8%] text-[8rem] font-black leading-none tracking-tighter pointer-events-none select-none"
                  style={{ color: branding.accentHex, opacity: 0.06 }}
                >
                  {branding.monogram}
                </span>

                {/* Header: Carrier Info & Monogram Badge */}
                <div className="flex items-start justify-between gap-4 z-10">
                  <div className="min-w-0">
                    <span className="block font-bold tracking-wider text-base md:text-lg uppercase truncate max-w-[190px] text-white">
                      {selectedCarrier?.name || "Select Carrier"}
                    </span>
                    <span className="block text-xs text-white/70 font-medium truncate max-w-[190px]">
                      {watchedPlanName || "Plan Name"}
                    </span>
                  </div>

                  {/* Carrier Monogram */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tracking-tight text-white shadow-sm border border-white/10"
                    style={{ backgroundColor: branding.accentHex + "38" }}
                  >
                    {branding.monogram}
                  </div>
                </div>

                {/* Middle: Member ID */}
                <div className="my-2 z-10">
                  <span className="block text-[9px] uppercase font-semibold text-white/50 tracking-widest">
                    Member ID
                  </span>
                  <span className="block font-mono text-lg md:text-xl font-bold tracking-widest text-white drop-shadow-sm truncate">
                    {formatMemberId(watchedMemberId || "")}
                  </span>
                </div>

                {/* Bottom Row: Metadata & Badges */}
                <div className="z-10 mt-auto">
                  <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-left">
                    <div className="min-w-0">
                      <span className="block text-[8px] uppercase tracking-wider text-white/40">
                        Group
                      </span>
                      <span className="block text-xs font-semibold truncate text-white/90">
                        {watchedGroupNumber || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[8px] uppercase tracking-wider text-white/40">
                        Subscriber
                      </span>
                      <span className="block text-xs font-semibold truncate text-white/90">
                        {watchedSubscriberName || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[8px] uppercase tracking-wider text-white/40">
                        Relationship
                      </span>
                      <span className="block text-xs font-semibold truncate text-white/90 font-medium">
                        {selectedRelationship}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3.5 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {watchedIsActive ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Terminated
                        </div>
                      )}

                      <div className="text-[10px] text-white/60 font-medium">
                        {watchedEffectiveDate
                          ? formatPolicyDate(watchedEffectiveDate)
                          : "—"}
                        {watchedTerminationDate
                          ? ` to ${formatPolicyDate(watchedTerminationDate)}`
                          : ""}
                      </div>
                    </div>

                    <div
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${branding.badgeBg} ${branding.badgeText} ${branding.badgeBorder}`}
                    >
                      {selectedCoverageOrder}
                    </div>
                  </div>
                </div>
              </div>

              {/* Help tip card */}
              <div className="rounded-xl border border-cf-border bg-cf-surface-muted p-4 text-xs text-cf-text-muted space-y-2">
                <div className="font-semibold text-cf-text flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Payer Verification Tip
                </div>
                <p>
                  Ensure the Member ID, Group, and Subscriber Name match the
                  physical card exactly. Discrepancies may delay billing claims
                  and authorization processing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
