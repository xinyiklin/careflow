import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, CalendarDays, Phone, UserPlus } from "lucide-react";

import { createPatient } from "../api/patients";
import usePatientDuplicateCheck from "../hooks/usePatientDuplicateCheck";
import {
  Badge,
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";
import { FormLabel } from "./PatientFormFields";
import { getErrorMessage } from "../../../shared/utils/errors";
import { formatDOB } from "../../../shared/utils/dateTime";
import {
  formatPhoneInput,
  getPhoneInputDigits,
  handleFormattedInputDeletion,
  PHONE_INPUT_PLACEHOLDER,
  validatePhoneNumber,
} from "../utils/contactValidation";

import type { KeyboardEvent } from "react";
import type { FieldError } from "react-hook-form";
import type { EntityId } from "../../../shared/api/types";
import type { PatientLike } from "../../../shared/types/domain";
import type { PatientGenderOption, PatientRecord } from "../types";

type QuickStartPhoneField = "phone_cell" | "phone_home" | "phone_work";

type QuickStartFormValues = {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  phone_cell: string;
  phone_home: string;
  phone_work: string;
  gender: string;
  sex_at_birth: string;
};

type PatientQuickStartModalProps = {
  isOpen: boolean;
  facilityId?: EntityId | null;
  genderOptions?: PatientGenderOption[];
  onClose?: () => void;
  onSaved?: (patient: PatientLike, options?: { useExisting?: boolean }) => void;
};

type QuickStartCandidate = PatientRecord & { id: EntityId };

type CandidateRowProps = {
  candidate: QuickStartCandidate;
  onUseExisting?: (candidate: QuickStartCandidate) => void;
  onDismiss?: (candidate: QuickStartCandidate) => void;
};

type CompletenessRingProps = {
  filled: number;
  total: number;
};

const QUICK_START_DEFAULTS: QuickStartFormValues = {
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  phone_cell: "",
  phone_home: "",
  phone_work: "",
  gender: "",
  sex_at_birth: "",
};

const TOTAL_FIELDS = 6;
const QUICK_START_PHONE_TYPE_OPTIONS = [
  { key: "phone_cell", label: "Cell", payloadLabel: "cell" },
  { key: "phone_home", label: "Home", payloadLabel: "home" },
  { key: "phone_work", label: "Work", payloadLabel: "work" },
] as const satisfies ReadonlyArray<{
  key: QuickStartPhoneField;
  label: string;
  payloadLabel: string;
}>;
const REQUIRED_QUICK_START_FIELDS = [
  "first_name",
  "last_name",
  "date_of_birth",
  "gender",
  "sex_at_birth",
] as const satisfies ReadonlyArray<keyof QuickStartFormValues>;

// USCDI v3 separates "sex assigned at birth" from "gender identity". Sex at
// birth drives lab reference ranges and several clinical safety checks, so it
// is required here even though the model column is `blank=True`.
const SEX_AT_BIRTH_QUICK_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "unknown", label: "Unknown" },
  { value: "undisclosed", label: "Choose not to disclose" },
];

function countFilled(values: QuickStartFormValues) {
  const requiredCount = REQUIRED_QUICK_START_FIELDS.reduce(
    (count, key) => (values?.[key]?.toString().trim() ? count + 1 : count),
    0
  );
  const hasPhone = QUICK_START_PHONE_TYPE_OPTIONS.some((option) =>
    getPhoneInputDigits(values?.[option.key]).trim()
  );
  return requiredCount + (hasPhone ? 1 : 0);
}

function FieldErrorSlot({ error }: { error?: FieldError }) {
  return (
    <div className="mt-1 min-h-5">
      {error ? (
        <p className="text-sm leading-5 text-cf-danger-text">{error.message}</p>
      ) : null}
    </div>
  );
}

function CandidateRow({
  candidate,
  onUseExisting,
  onDismiss,
}: CandidateRowProps) {
  const fullName = [candidate.last_name, candidate.first_name]
    .filter(Boolean)
    .join(", ");
  const dob = candidate.date_of_birth ? formatDOB(candidate.date_of_birth) : "";

  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-cf-text">
            {fullName || "Unnamed patient"}
          </div>
          <div className="mt-0.5 text-[11px] text-cf-text-muted">
            {[
              candidate.chart_number ? `MRN ${candidate.chart_number}` : "",
              dob ? `DOB ${dob}` : "",
              candidate.gender_name || "",
            ]
              .filter(Boolean)
              .join(" · ") || "Existing patient"}
          </div>
        </div>
        <Badge variant="warning">Possible match</Badge>
      </div>
      <div className="mt-1.5 flex justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => onDismiss?.(candidate)}
        >
          Different patient
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => onUseExisting?.(candidate)}
        >
          Use this chart
        </Button>
      </div>
    </div>
  );
}

function CompletenessRing({ filled, total }: CompletenessRingProps) {
  const percent = total ? Math.round((filled / total) * 100) : 0;
  const dashLength = Math.max(0, Math.min(percent, 100));

  return (
    <div className="flex items-center gap-2.5">
      <svg
        className="h-12 w-12 -rotate-90"
        viewBox="0 0 36 36"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="var(--color-cf-border)"
          strokeWidth="3.6"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="var(--color-cf-accent)"
          strokeWidth="3.6"
          strokeDasharray={`${dashLength} 100`}
          strokeLinecap="round"
        />
      </svg>
      <div>
        <div className="text-lg font-semibold tracking-tight text-cf-text">
          {percent}%
        </div>
        <div className="text-[11px] text-cf-text-muted">
          {filled} of {total} required filled
        </div>
      </div>
    </div>
  );
}

export default function PatientQuickStartModal({
  isOpen,
  facilityId,
  genderOptions = [],
  onClose,
  onSaved,
}: PatientQuickStartModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<QuickStartFormValues>({ defaultValues: QUICK_START_DEFAULTS });

  const [submitError, setSubmitError] = useState("");
  const [dismissedCandidateIds, setDismissedCandidateIds] = useState<
    EntityId[]
  >([]);

  const watchedFirstName = watch("first_name");
  const watchedLastName = watch("last_name");
  const watchedDob = watch("date_of_birth");
  const watchedPhoneCell = watch("phone_cell");
  const watchedPhoneHome = watch("phone_home");
  const watchedPhoneWork = watch("phone_work");
  const watchedValues = watch();
  const watchedPhone =
    getPhoneInputDigits(watchedPhoneCell) ||
    getPhoneInputDigits(watchedPhoneHome) ||
    getPhoneInputDigits(watchedPhoneWork);

  const filledCount = countFilled(watchedValues);

  const duplicateCheck = usePatientDuplicateCheck({
    facilityId,
    firstName: watchedFirstName,
    lastName: watchedLastName,
    dateOfBirth: watchedDob,
    phone: watchedPhone,
  });

  const visibleCandidates = useMemo(
    () =>
      duplicateCheck.candidates.filter(
        (candidate): candidate is QuickStartCandidate => {
          if (candidate.id === undefined || candidate.id === null) return false;
          return !dismissedCandidateIds.includes(candidate.id);
        }
      ),
    [duplicateCheck.candidates, dismissedCandidateIds]
  );

  const handleClose = () => {
    setSubmitError("");
    setDismissedCandidateIds([]);
    reset(QUICK_START_DEFAULTS);
    onClose?.();
  };

  const submitForm = async (data: QuickStartFormValues) => {
    setSubmitError("");

    const phones = QUICK_START_PHONE_TYPE_OPTIONS.map(
      ({ key, payloadLabel }) => ({
        label: payloadLabel,
        number: getPhoneInputDigits(data[key]),
      })
    )
      .filter((phone) => phone.number)
      .map((phone, index) => ({ ...phone, is_primary: index === 0 }));

    if (!phones.length) {
      setError("phone_cell", {
        type: "manual",
        message: "At least one phone number is required.",
      });
      return;
    }

    clearErrors(["phone_cell", "phone_home", "phone_work"]);

    const payload = {
      first_name: data.first_name.trim(),
      middle_name: data.middle_name.trim(),
      last_name: data.last_name.trim(),
      date_of_birth: data.date_of_birth,
      gender: Number(data.gender),
      sex_at_birth: data.sex_at_birth,
      phones,
    };

    try {
      const savedPatient = await createPatient(payload, facilityId);
      if (savedPatient) onSaved?.(savedPatient);
      reset(QUICK_START_DEFAULTS);
      setDismissedCandidateIds([]);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Failed to create patient."));
    }
  };

  const dismissCandidate = (candidate: QuickStartCandidate) => {
    setDismissedCandidateIds((current) => [...current, candidate.id]);
  };

  const useExistingCandidate = (candidate: QuickStartCandidate) => {
    onSaved?.(candidate, { useExisting: true });
    reset(QUICK_START_DEFAULTS);
    setDismissedCandidateIds([]);
  };

  const registerQuickStartPhone = (name: QuickStartPhoneField) =>
    register(name, {
      setValueAs: getPhoneInputDigits,
      validate: (value) => {
        const phoneError = validatePhoneNumber(value);
        if (phoneError) return phoneError;
        return true;
      },
    });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Registration"
      title="New Patient Registration"
      maxWidth="4xl"
      panelClassName="max-h-[min(94dvh,720px)]"
      bodyClassName="p-0"
      footer={
        <>
          <span className="text-xs text-cf-text-subtle">
            {duplicateCheck.isLoading
              ? "Checking for matches…"
              : !duplicateCheck.enabled
                ? "Duplicate check waiting"
                : visibleCandidates.length
                  ? `${visibleCandidates.length} possible match${visibleCandidates.length === 1 ? "" : "es"} on file`
                  : "No matches found"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" onClick={handleClose} variant="default">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(submitForm)}
              disabled={isSubmitting || !facilityId}
              variant="primary"
              className="!text-cf-page-bg disabled:!border-cf-border disabled:!bg-cf-surface-soft disabled:!text-cf-text-muted disabled:!opacity-100"
            >
              <UserPlus className="h-4 w-4" />
              {isSubmitting ? "Creating…" : "Create & open chart"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(submitForm)}
        className="grid min-h-0 gap-0 bg-cf-surface lg:grid-cols-[minmax(0,1fr)_250px]"
      >
        <div className="px-6 py-5 lg:pr-7">
          {submitError ? (
            <Notice
              tone="danger"
              title="Patient was not created"
              className="mb-4"
            >
              {submitError}
            </Notice>
          ) : null}

          <div className="grid gap-x-4 gap-y-3 md:grid-cols-3">
            <div>
              <FormLabel required>Legal first name</FormLabel>
              <Input
                type="text"
                autoFocus
                {...register("first_name", {
                  required: "First name required.",
                })}
              />
              <FieldErrorSlot error={errors.first_name} />
            </div>

            <div>
              <FormLabel>Middle name</FormLabel>
              <Input type="text" {...register("middle_name")} />
              <FieldErrorSlot />
            </div>

            <div>
              <FormLabel required>Legal last name</FormLabel>
              <Input
                type="text"
                {...register("last_name", {
                  required: "Last name required.",
                })}
              />
              <FieldErrorSlot error={errors.last_name} />
            </div>

            <div>
              <FormLabel required>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date of birth
                </span>
              </FormLabel>
              <Input
                type="date"
                {...register("date_of_birth", {
                  required: "DOB required.",
                })}
              />
              <FieldErrorSlot error={errors.date_of_birth} />
            </div>

            <div>
              <FormLabel required>Gender identity</FormLabel>
              <Input
                as="select"
                {...register("gender", {
                  required: "Gender required.",
                })}
              >
                <option value="">Select…</option>
                {genderOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Input>
              <FieldErrorSlot error={errors.gender} />
            </div>

            <div>
              <FormLabel required>Sex assigned at birth</FormLabel>
              <Input
                as="select"
                {...register("sex_at_birth", {
                  required: "Sex required.",
                })}
              >
                {SEX_AT_BIRTH_QUICK_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
              <FieldErrorSlot error={errors.sex_at_birth} />
            </div>

            <div className="md:col-span-3">
              <FormLabel required>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </span>
              </FormLabel>
              <div className="grid gap-x-4 gap-y-3 md:grid-cols-3">
                {QUICK_START_PHONE_TYPE_OPTIONS.map((option) => {
                  const phoneRegistration = registerQuickStartPhone(option.key);
                  const fieldError = errors[option.key];

                  return (
                    <div key={option.key} className="min-w-0">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                        {option.label}
                      </div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder={PHONE_INPUT_PLACEHOLDER}
                        {...phoneRegistration}
                        onChange={(event) => {
                          event.currentTarget.value = formatPhoneInput(
                            event.currentTarget.value
                          );
                          phoneRegistration.onChange(event);
                          if (getPhoneInputDigits(event.currentTarget.value)) {
                            clearErrors([
                              "phone_cell",
                              "phone_home",
                              "phone_work",
                            ]);
                          }
                        }}
                        onKeyDown={(event) =>
                          handleFormattedInputDeletion(
                            event as KeyboardEvent<HTMLInputElement>,
                            formatPhoneInput,
                            (nextValue) => {
                              event.currentTarget.value = nextValue;
                              phoneRegistration.onChange(event);
                            }
                          )
                        }
                      />
                      {fieldError && option.key !== "phone_cell" ? (
                        <p className="mt-1 text-sm leading-5 text-cf-danger-text">
                          {fieldError.message}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <FieldErrorSlot error={errors.phone_cell} />
            </div>
          </div>
        </div>

        <aside className="border-t border-cf-border bg-cf-surface px-4 py-4 lg:border-t-0 lg:border-l">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Live duplicate check
          </div>

          <div className="mt-3 space-y-2">
            {duplicateCheck.enabled ? (
              visibleCandidates.length ? (
                visibleCandidates
                  .slice(0, 2)
                  .map((candidate) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      onDismiss={dismissCandidate}
                      onUseExisting={useExistingCandidate}
                    />
                  ))
              ) : duplicateCheck.isLoading ? (
                <div className="rounded-xl border border-dashed border-cf-border bg-cf-surface-muted/55 px-3 py-2 text-[11px] text-cf-text-muted">
                  Checking…
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-cf-border bg-cf-surface-muted/55 px-3 py-2 text-[11px] text-cf-text-muted">
                  No matches found — safe to create.
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-cf-border bg-cf-surface-muted/55 px-3 py-2 text-[11px] text-cf-text-subtle">
                Waiting for name and DOB.
              </div>
            )}
          </div>

          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Intake completeness
          </div>
          <div className="mt-2">
            <CompletenessRing filled={filledCount} total={TOTAL_FIELDS} />
          </div>
        </aside>
      </form>
    </ModalShell>
  );
}
