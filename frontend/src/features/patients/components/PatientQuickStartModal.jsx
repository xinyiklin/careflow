import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowRight,
  CalendarDays,
  Phone,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { createPatient } from "../api/patients";
import usePatientDuplicateCheck from "../hooks/usePatientDuplicateCheck";
import {
  Badge,
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";
import { FieldError, FieldHint, FormLabel } from "./PatientFormFields";
import { getErrorMessage } from "../../../shared/utils/errors";
import { formatDOB } from "../../../shared/utils/dateTime";
import {
  formatPhoneInput,
  getPhoneInputDigits,
  handleFormattedInputDeletion,
  validatePhoneNumber,
} from "../utils/contactValidation";

const QUICK_START_DEFAULTS = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  phone_cell: "",
  gender: "",
  sex_at_birth: "",
};

const TOTAL_FIELDS = 6;

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

function countFilled(values) {
  return Object.values(QUICK_START_DEFAULTS).reduce(
    (count, _placeholder, index) => {
      const key = Object.keys(QUICK_START_DEFAULTS)[index];
      return values?.[key]?.toString().trim() ? count + 1 : count;
    },
    0
  );
}

function CandidateRow({ candidate, onUseExisting, onDismiss }) {
  const fullName = [candidate.last_name, candidate.first_name]
    .filter(Boolean)
    .join(", ");
  const dob = candidate.date_of_birth ? formatDOB(candidate.date_of_birth) : "";

  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2.5 shadow-sm">
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
      <div className="mt-2 flex justify-end gap-1.5">
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

function CompletenessRing({ filled, total }) {
  const percent = total ? Math.round((filled / total) * 100) : 0;
  const dashLength = Math.max(0, Math.min(percent, 100));

  return (
    <div className="flex items-center gap-3">
      <svg
        className="h-16 w-16 -rotate-90"
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
        <div className="text-xl font-semibold tracking-tight text-cf-text">
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
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: QUICK_START_DEFAULTS });

  const [submitError, setSubmitError] = useState("");
  const [dismissedCandidateIds, setDismissedCandidateIds] = useState([]);

  const watchedFirstName = watch("first_name");
  const watchedLastName = watch("last_name");
  const watchedDob = watch("date_of_birth");
  const watchedPhone = watch("phone_cell");
  const watchedValues = watch();

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
        (candidate) => !dismissedCandidateIds.includes(candidate.id)
      ),
    [duplicateCheck.candidates, dismissedCandidateIds]
  );

  const handleClose = () => {
    setSubmitError("");
    setDismissedCandidateIds([]);
    reset(QUICK_START_DEFAULTS);
    onClose?.();
  };

  const submitForm = async (data) => {
    setSubmitError("");

    const payload = {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      date_of_birth: data.date_of_birth,
      gender: Number(data.gender),
      sex_at_birth: data.sex_at_birth,
      phones: [{ label: "cell", number: getPhoneInputDigits(data.phone_cell) }],
    };

    try {
      const savedPatient = await createPatient(payload, facilityId);
      onSaved?.(savedPatient);
      reset(QUICK_START_DEFAULTS);
      setDismissedCandidateIds([]);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Failed to create patient."));
    }
  };

  const dismissCandidate = (candidate) => {
    if (!candidate?.id) return;
    setDismissedCandidateIds((current) => [...current, candidate.id]);
  };

  const useExistingCandidate = (candidate) => {
    if (!candidate?.id) return;
    onSaved?.(candidate, { useExisting: true });
    reset(QUICK_START_DEFAULTS);
    setDismissedCandidateIds([]);
  };

  const phoneCellRegistration = register("phone_cell", {
    required: "At least one phone number is required.",
    setValueAs: getPhoneInputDigits,
    validate: (value) => validatePhoneNumber(value) || true,
  });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Registration · Quick start"
      title="Add a patient"
      description="Just enough to start a chart. The rest fills in from the chart or via the patient portal."
      maxWidth="3xl"
      panelClassName="max-h-[min(94dvh,720px)]"
      bodyClassName="p-0"
      footer={
        <>
          <span className="text-xs text-cf-text-subtle">
            {duplicateCheck.isLoading
              ? "Checking for matches…"
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
        className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        <div className="px-6 py-5">
          {submitError ? (
            <Notice
              tone="danger"
              title="Patient was not created"
              className="mb-4"
            >
              {submitError}
            </Notice>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FormLabel required compact>
                Legal first name
              </FormLabel>
              <Input
                type="text"
                autoFocus
                {...register("first_name", {
                  required: "First name is required.",
                })}
              />
              <FieldError error={errors.first_name} />
            </div>

            <div>
              <FormLabel required compact>
                Legal last name
              </FormLabel>
              <Input
                type="text"
                {...register("last_name", {
                  required: "Last name is required.",
                })}
              />
              <FieldError error={errors.last_name} />
            </div>

            <div>
              <FormLabel required compact>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date of birth
                </span>
              </FormLabel>
              <Input
                type="date"
                {...register("date_of_birth", {
                  required: "Date of birth is required.",
                })}
              />
              <FieldError error={errors.date_of_birth} />
            </div>

            <div>
              <FormLabel required compact>
                Gender identity
              </FormLabel>
              <Input
                as="select"
                {...register("gender", {
                  required: "Gender identity is required.",
                })}
              >
                <option value="">Select…</option>
                {genderOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Input>
              <FieldError error={errors.gender} />
            </div>

            <div>
              <FormLabel required compact>
                Sex assigned at birth
              </FormLabel>
              <Input
                as="select"
                {...register("sex_at_birth", {
                  required: "Sex at birth is required.",
                })}
              >
                {SEX_AT_BIRTH_QUICK_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
              {errors.sex_at_birth ? (
                <FieldError error={errors.sex_at_birth} />
              ) : (
                <FieldHint>
                  Used for lab reference ranges and clinical safety checks.
                </FieldHint>
              )}
            </div>

            <div className="md:col-span-2">
              <FormLabel required compact>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Best phone
                </span>
              </FormLabel>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="(555)555-1234"
                {...phoneCellRegistration}
                onChange={(event) => {
                  event.target.value = formatPhoneInput(event.target.value);
                  phoneCellRegistration.onChange(event);
                }}
                onKeyDown={(event) =>
                  handleFormattedInputDeletion(
                    event,
                    formatPhoneInput,
                    (nextValue) => {
                      event.target.value = nextValue;
                      phoneCellRegistration.onChange(event);
                    }
                  )
                }
              />
              {errors.phone_cell ? (
                <FieldError error={errors.phone_cell} />
              ) : (
                <FieldHint>
                  Stored as the patient&apos;s primary cell number. More phones
                  can be added from the chart.
                </FieldHint>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-cf-border bg-cf-surface-muted/55 px-4 py-3">
            <div className="flex items-start gap-2 text-[11px] text-cf-text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
              <p>
                MRN is auto-assigned. Address, insurance, emergency contact,
                clinical demographics, and pharmacy can all be filled in inline
                from the chart after this step.
              </p>
            </div>
          </div>
        </div>

        <aside className="border-t border-cf-border bg-cf-surface-muted/55 px-5 py-5 lg:border-t-0 lg:border-l">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Live duplicate check
          </div>
          <p className="mt-1 text-xs text-cf-text-muted">
            We cross-check the facility roster as fields fill in.
          </p>

          <div className="mt-3 space-y-2">
            {duplicateCheck.enabled ? (
              visibleCandidates.length ? (
                visibleCandidates
                  .slice(0, 3)
                  .map((candidate) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      onDismiss={dismissCandidate}
                      onUseExisting={useExistingCandidate}
                    />
                  ))
              ) : duplicateCheck.isLoading ? (
                <div className="rounded-xl border border-dashed border-cf-border bg-cf-surface px-3 py-3 text-[11px] text-cf-text-muted">
                  Checking…
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-cf-border bg-cf-surface px-3 py-3 text-[11px] text-cf-text-muted">
                  No matches found — safe to create.
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-cf-border bg-cf-surface px-3 py-3 text-[11px] text-cf-text-subtle">
                Add a name and DOB to start cross-checking.
              </div>
            )}
          </div>

          <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Intake completeness
          </div>
          <div className="mt-2">
            <CompletenessRing filled={filledCount} total={TOTAL_FIELDS} />
          </div>
          <p className="mt-3 text-[11px] text-cf-text-muted">
            Required fields only. Optional demographics, insurance, and
            emergency contacts can be completed in the chart.
          </p>
        </aside>
      </form>
    </ModalShell>
  );
}
