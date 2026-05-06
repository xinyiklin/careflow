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
        <div className="shrink-0 border-b border-cf-border bg-cf-surface-muted/50 px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-cf-text-subtle" />
              <Badge variant={isEditing ? "outline" : "success"}>
                {isEditing ? "Edit policy" : "New policy"}
              </Badge>
              <span className="max-w-56 truncate font-semibold text-cf-text">
                {selectedCarrier?.name || "Select carrier"}
              </span>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-cf-text-muted">
              <span className="inline-flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                {watchedMemberId || "Member ID"}
              </span>
              {watchedGroupNumber ? (
                <span>Group {watchedGroupNumber}</span>
              ) : null}
              <span>{selectedRelationship}</span>
              <span>
                {formatPolicyDate(watchedEffectiveDate)} -{" "}
                {formatPolicyDate(watchedTerminationDate)}
              </span>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  watchedCoverageOrder === "primary" ? "success" : "muted"
                }
              >
                {selectedCoverageOrder}
              </Badge>
              <Badge variant={watchedIsActive ? "outline" : "warning"}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {watchedIsActive ? "Active" : "Terminated"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="min-h-0 max-h-[calc(94dvh-12rem)] overflow-y-auto bg-cf-surface px-5 py-3">
          <div className="grid gap-x-6 gap-y-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label compact>Effective Date</Label>
                  <Input type="date" {...register("effective_date")} />
                </div>

                <div>
                  <Label compact>Termination Date</Label>
                  <Input type="date" {...register("termination_date")} />
                </div>

                <div className="md:col-span-2">
                  <Label compact>Coverage Level</Label>
                  <input type="hidden" {...register("coverage_order")} />
                  <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-2">
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

                <div>
                  <Label compact>Status</Label>
                  <input type="hidden" {...register("is_active")} />
                  <div className="grid gap-2 sm:grid-cols-2">
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
                placeholder="Authorization requirements, verification notes, or billing instructions"
                {...register("notes")}
              />
            </FieldSection>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
