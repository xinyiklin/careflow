import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { FieldError, FormLabel as Label } from "./PatientFormFields";
import {
  Badge,
  Button,
  Input,
  ModalShell,
} from "../../../shared/components/ui";

const RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "other", label: "Other" },
];

const COVERAGE_ORDER_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "tertiary", label: "Tertiary" },
  { value: "other", label: "Other" },
];

const defaultValues = {
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

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-cf-border bg-cf-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-cf-text">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-cf-text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
      <div className="mt-1 min-h-5 truncate text-sm font-medium text-cf-text">
        {value || "—"}
      </div>
    </div>
  );
}

function formatPolicyDate(value) {
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
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      carrier: policy?.carrier || "",
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
  const watchedMemberId = watch("member_id");
  const watchedGroupNumber = watch("group_number");
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Insurance"
      maxWidth="4xl"
      panelClassName="h-[min(90vh,880px)]"
      bodyClassName="flex-1 overflow-hidden p-0"
      footerClassName="bg-cf-surface"
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
        className="grid h-full min-h-0 lg:grid-cols-[300px_minmax(0,1fr)]"
      >
        <aside className="min-h-0 overflow-y-auto border-b border-cf-border bg-cf-surface-muted/65 px-5 py-5 lg:border-r lg:border-b-0">
          <div className="space-y-5">
            <section className="rounded-2xl border border-cf-border bg-cf-surface px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <Badge variant={isEditing ? "outline" : "success"}>
                    {isEditing ? "Edit policy" : "New policy"}
                  </Badge>
                  <div className="mt-2 truncate text-base font-semibold text-cf-text">
                    {selectedCarrier?.name || "Select carrier"}
                  </div>
                  <p className="mt-1 text-sm text-cf-text-muted">
                    Coverage and subscriber details for this patient.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                <CreditCard className="h-3.5 w-3.5" />
                Policy Snapshot
              </div>

              <div className="grid gap-2">
                <SummaryItem label="Carrier" value={selectedCarrier?.name} />
                <SummaryItem label="Member ID" value={watchedMemberId} />
                <SummaryItem label="Group" value={watchedGroupNumber} />
                <SummaryItem label="Order" value={selectedCoverageOrder} />
                <SummaryItem
                  label="Relationship"
                  value={selectedRelationship}
                />
                <SummaryItem
                  label="Effective"
                  value={formatPolicyDate(watchedEffectiveDate)}
                />
                <SummaryItem
                  label="Ends"
                  value={formatPolicyDate(watchedTerminationDate)}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-cf-border bg-cf-surface px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
                <CheckCircle2 className="h-4 w-4 text-cf-text-subtle" />
                Policy Status
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  variant={
                    watchedCoverageOrder === "primary" ? "success" : "muted"
                  }
                >
                  {selectedCoverageOrder}
                </Badge>
                <Badge variant={watchedIsActive ? "outline" : "warning"}>
                  {watchedIsActive ? "Active" : "Terminated"}
                </Badge>
              </div>
            </section>
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto bg-cf-page-bg px-5 py-5">
          <div className="space-y-5">
            <SectionCard
              icon={ShieldCheck}
              title="Coverage"
              description="Identify the carrier, plan, and policy numbers used for billing."
            >
              <div className="grid gap-4 md:grid-cols-2">
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
            </SectionCard>

            <SectionCard
              icon={UserRoundCheck}
              title="Subscriber"
              description="Track who holds the policy and how they relate to the patient."
            >
              <div className="grid gap-4 md:grid-cols-2">
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
            </SectionCard>

            <SectionCard
              icon={CalendarDays}
              title="Dates and Status"
              description="Set coverage dates, policy order, and active status."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label compact>Effective Date</Label>
                  <Input type="date" {...register("effective_date")} />
                </div>

                <div>
                  <Label compact>Termination Date</Label>
                  <Input type="date" {...register("termination_date")} />
                </div>

                <div className="md:col-span-2">
                  <Label compact>Policy Order</Label>
                  <input type="hidden" {...register("coverage_order")} />
                  <div className="grid gap-2 sm:grid-cols-4">
                    {COVERAGE_ORDER_OPTIONS.map((option) => {
                      const isSelected = watchedCoverageOrder === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setValue("coverage_order", option.value)
                          }
                          className={[
                            "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                            isSelected
                              ? "border-cf-accent bg-cf-accent text-white shadow-sm"
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

                <label className="flex min-h-12 items-center gap-3 rounded-xl border border-cf-border bg-cf-surface-soft px-3 py-3 text-sm font-medium text-cf-text-muted">
                  <input type="hidden" {...register("is_active")} />
                  <input
                    type="checkbox"
                    checked={!watchedIsActive}
                    onChange={(event) => {
                      setValue("is_active", !event.target.checked);
                    }}
                    className="h-4 w-4 rounded border-cf-border"
                  />
                  Terminated
                </label>
              </div>
            </SectionCard>

            <SectionCard
              icon={FileText}
              title="Notes"
              description="Store payer-specific instructions, authorization notes, or verification details."
            >
              <Input
                as="textarea"
                rows={5}
                placeholder="Authorization requirements, verification notes, or billing instructions"
                {...register("notes")}
              />
            </SectionCard>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
