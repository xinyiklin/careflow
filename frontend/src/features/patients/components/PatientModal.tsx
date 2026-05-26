import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  createPatient,
  revealPatientSsn,
  updatePatient,
} from "../api/patients";
import { Button, Notice } from "../../../shared/components/ui";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";
import useModalFocusTrap from "../../../shared/hooks/useModalFocusTrap";
import {
  useLatestOpenValue,
  useModalPresence,
} from "../../../shared/hooks/useModalPresence";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  EMPTY_PATIENT_FORM_VALUES,
  getEmergencyContacts,
  getMaskedSsn,
  getPatientInitials,
  getPatientName,
  getPhoneNumberByLabel,
} from "./patientModalData";
import PatientModalHeader from "./PatientModalHeader";
import PatientEmergencyContactsSection from "./PatientEmergencyContactsSection";
import {
  PatientContactPanel,
  PatientIdentityPanel,
} from "./PatientIdentityContactPanels";
import {
  PatientAddressPanel,
  PatientCareTeamPanel,
  PatientClinicalProfilePanel,
} from "./PatientClinicalPanels";
import {
  RegistrationLens,
  RegistrationRail,
  buildRegistrationSteps,
  getStepErrors,
} from "./PatientRegistrationProgress";
import {
  formatPhoneInput,
  formatSsnInput,
  getPhoneInputDigits,
  getSsnInputDigits,
  handleFormattedInputDeletion,
} from "../utils/contactValidation";

import type { KeyboardEvent } from "react";
import type {
  FieldPath,
  RegisterOptions,
  SubmitHandler,
} from "react-hook-form";
import type { ApiPayload, EntityId } from "../../../shared/api/types";
import type {
  PatientCareProvider,
  PatientFormValues,
  PatientRecord,
  PatientSelectOption,
  RegisterFormattedField,
} from "../types";

const STEP_ORDER = ["identity", "contact", "address", "clinical", "contacts"];

function getCurrentStepNumber(stepKey: string): number {
  return STEP_ORDER.indexOf(stepKey) + 1;
}

function getCurrentStepTitle(stepKey: string): string {
  switch (stepKey) {
    case "identity":
      return "Identity & Demographics";
    case "contact":
      return "Contact Information";
    case "address":
      return "Patient Address";
    case "clinical":
      return "Clinical Profile & Routing";
    case "contacts":
      return "Emergency Contacts";
    default:
      return "";
  }
}

type PatientModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  patient?: PatientRecord | null;
  facilityId?: EntityId | null;
  genderOptions: PatientSelectOption[];
  careProviders?: PatientCareProvider[];
  onClose?: () => void;
  onSaved?: (patient: PatientRecord) => void;
};

export default function PatientModal({
  isOpen,
  mode,
  patient,
  facilityId,
  genderOptions,
  careProviders = [],
  onClose,
  onSaved,
}: PatientModalProps) {
  const { isClosing, shouldRender } = useModalPresence(isOpen);
  const displayedState = useLatestOpenValue(
    { facilityId, mode, patient },
    isOpen
  );
  const displayedFacilityId = displayedState.facilityId;
  const displayedMode = displayedState.mode;
  const displayedPatient = displayedState.patient;
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    defaultValues: EMPTY_PATIENT_FORM_VALUES,
  });
  const {
    fields: emergencyContactFields,
    append: appendEmergencyContact,
    remove: removeEmergencyContact,
  } = useFieldArray({
    control,
    name: "emergency_contacts",
  });
  const [submitError, setSubmitError] = useState("");
  const [activeStep, setActiveStep] = useState<string>("identity");
  const [primaryEmergencyContactIndex, setPrimaryEmergencyContactIndex] =
    useState(0);
  const [editingEmergencyContactIndex, setEditingEmergencyContactIndex] =
    useState<number | null>(null);
  const [showFullSsn, setShowFullSsn] = useState(false);
  const [ssnHint, setSsnHint] = useState("");
  const [revealedSsn, setRevealedSsn] = useState("");
  const watchedValues = watch();
  const watchedEmergencyContacts = watch("emergency_contacts") || [];
  const watchedSsn = watch("ssn") || "";
  const raceDeclined = watch("race_declined");
  const ethnicityDeclined = watch("ethnicity_declined");
  const preferredLanguageDeclined = watch("preferred_language_declined");
  const ssnDisplayValue = watchedSsn || revealedSsn;
  const hasStoredSsn = Boolean(displayedPatient?.ssn_last4 || ssnDisplayValue);
  const maskedSsn = getMaskedSsn(ssnDisplayValue, displayedPatient?.ssn_last4);
  const shouldEditSsn = showFullSsn || !hasStoredSsn;
  const registrationSteps = buildRegistrationSteps(watchedValues);
  const completionPercent = Math.round(
    (registrationSteps.filter((step) => step.complete).length /
      registrationSteps.length) *
      100
  );
  const patientName = getPatientName(watchedValues, displayedPatient);
  const patientInitials = getPatientInitials(watchedValues, displayedPatient);
  const primaryEmergencyContact =
    watchedEmergencyContacts[primaryEmergencyContactIndex] ||
    watchedEmergencyContacts[0] ||
    null;

  const activeIndex = STEP_ORDER.indexOf(activeStep);

  const handleBack = () => {
    if (activeIndex > 0) {
      setActiveStep(STEP_ORDER[activeIndex - 1]);
    }
  };

  const handleNext = () => {
    if (activeIndex < STEP_ORDER.length - 1) {
      setActiveStep(STEP_ORDER[activeIndex + 1]);
    }
  };

  const { modalRef, modalStyle, dragHandleProps } = useDraggableModal({
    isOpen,
  });
  const { handlePanelKeyDown } = useModalFocusTrap(modalRef, isOpen, onClose);

  const registerFormattedField = <TName extends FieldPath<PatientFormValues>>(
    name: TName,
    formatInput: (value: unknown) => string,
    normalizeValue: (value: unknown) => string,
    options: RegisterOptions<PatientFormValues, TName> = {}
  ) => {
    const registration = register(name, {
      ...options,
      setValueAs: normalizeValue,
    });
    return {
      ...registration,
      onChange: (event: Parameters<typeof registration.onChange>[0]) => {
        event.target.value = formatInput(event.target.value);
        return registration.onChange(event);
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) =>
        handleFormattedInputDeletion(event, formatInput, (nextValue) => {
          event.currentTarget.value = nextValue;
          void registration.onChange(event);
        }),
    };
  };

  const registerPhoneField: RegisterFormattedField = (name, options = {}) =>
    registerFormattedField(
      name,
      formatPhoneInput,
      getPhoneInputDigits,
      options
    );

  const registerSsnField: RegisterFormattedField = (name, options = {}) =>
    registerFormattedField(name, formatSsnInput, getSsnInputDigits, options);

  useEffect(() => {
    if (!isOpen) return;

    const emergencyContacts = getEmergencyContacts(displayedPatient).map(
      (contact) => ({
        ...contact,
        phone_number: formatPhoneInput(contact.phone_number),
      })
    );
    const primaryIndex = Math.max(
      0,
      emergencyContacts.findIndex((contact) => contact.is_primary)
    );

    reset({
      first_name: displayedPatient?.first_name || "",
      middle_name: displayedPatient?.middle_name || "",
      last_name: displayedPatient?.last_name || "",
      preferred_name: displayedPatient?.preferred_name || "",
      date_of_birth: displayedPatient?.date_of_birth || "",
      gender: displayedPatient?.gender ? String(displayedPatient.gender) : "",
      sex_at_birth: displayedPatient?.sex_at_birth || "",
      race: displayedPatient?.race || "",
      race_declined: displayedPatient?.race_declined || false,
      ethnicity: displayedPatient?.ethnicity || "",
      ethnicity_declined: displayedPatient?.ethnicity_declined || false,
      preferred_language: displayedPatient?.preferred_language || "",
      preferred_language_declined:
        displayedPatient?.preferred_language_declined || false,
      pronouns: displayedPatient?.pronouns || "",
      email: displayedPatient?.email || "",
      address_line_1: displayedPatient?.address?.line_1 || "",
      address_line_2: displayedPatient?.address?.line_2 || "",
      address_city: displayedPatient?.address?.city || "",
      address_state: displayedPatient?.address?.state || "NY",
      address_zip_code: displayedPatient?.address?.zip_code || "",
      phone_cell: formatPhoneInput(
        getPhoneNumberByLabel(displayedPatient, "cell")
      ),
      phone_home: formatPhoneInput(
        getPhoneNumberByLabel(displayedPatient, "home")
      ),
      phone_work: formatPhoneInput(
        getPhoneNumberByLabel(displayedPatient, "work")
      ),
      emergency_contact_name: displayedPatient?.emergency_contact_name || "",
      emergency_contact_relationship:
        displayedPatient?.emergency_contact_relationship || "",
      emergency_contact_phone: formatPhoneInput(
        displayedPatient?.emergency_contact_phone
      ),
      emergency_contacts: emergencyContacts,
      ssn: "",
      ssn_last4: displayedPatient?.ssn_last4 || "",
      pcp: displayedPatient?.pcp ? String(displayedPatient.pcp) : "",
      referring_provider: displayedPatient?.referring_provider
        ? String(displayedPatient.referring_provider)
        : "",
      preferred_pharmacy: displayedPatient?.preferred_pharmacy
        ? String(displayedPatient.preferred_pharmacy)
        : "",
      is_active: displayedPatient?.is_active ?? true,
    });
    setPrimaryEmergencyContactIndex(primaryIndex === -1 ? 0 : primaryIndex);
    setEditingEmergencyContactIndex(null);
    setShowFullSsn(false);
    setSsnHint("");
    setRevealedSsn("");
    setSubmitError("");
    setActiveStep("identity");
  }, [displayedPatient, isOpen, reset]);

  if (!shouldRender) return null;

  const onSubmit: SubmitHandler<PatientFormValues> = async (data) => {
    const phones = [
      { label: "cell", number: getPhoneInputDigits(data.phone_cell) },
      { label: "home", number: getPhoneInputDigits(data.phone_home) },
      { label: "work", number: getPhoneInputDigits(data.phone_work) },
    ].filter((phone) => phone.number);

    let emergencyContacts = (data.emergency_contacts || [])
      .map((contact, index) => ({
        name: (contact.name || "").trim(),
        relationship: (contact.relationship || "").trim(),
        phone_number: getPhoneInputDigits(contact.phone_number),
        notes: (contact.notes || "").trim(),
        is_primary: index === primaryEmergencyContactIndex,
      }))
      .filter((contact) =>
        [
          contact.name,
          contact.relationship,
          contact.phone_number,
          contact.notes,
        ].some(Boolean)
      );
    if (
      emergencyContacts.length &&
      !emergencyContacts.some((contact) => contact.is_primary)
    ) {
      emergencyContacts = emergencyContacts.map((contact, index) => ({
        ...contact,
        is_primary: index === 0,
      }));
    }
    const primaryEmergencyContact =
      emergencyContacts.find((contact) => contact.is_primary) ||
      emergencyContacts[0] ||
      null;
    const addressLine1 = data.address_line_1.trim();
    const address = addressLine1
      ? {
          line_1: addressLine1,
          line_2: data.address_line_2.trim(),
          city: data.address_city.trim(),
          state: data.address_state || "NY",
          zip_code: data.address_zip_code.trim(),
        }
      : null;
    const normalizedSsn = String(data.ssn || "").replace(/\D/g, "");

    const payload: ApiPayload = {
      first_name: data.first_name.trim(),
      middle_name: data.middle_name.trim(),
      last_name: data.last_name.trim(),
      preferred_name: data.preferred_name.trim(),
      date_of_birth: data.date_of_birth,
      gender: Number(data.gender),
      sex_at_birth: data.sex_at_birth,
      race: data.race_declined ? "" : data.race,
      race_declined: data.race_declined,
      ethnicity: data.ethnicity_declined ? "" : data.ethnicity,
      ethnicity_declined: data.ethnicity_declined,
      preferred_language: data.preferred_language_declined
        ? ""
        : data.preferred_language.trim(),
      preferred_language_declined: data.preferred_language_declined,
      pronouns: data.pronouns.trim(),
      email: data.email.trim(),
      address,
      phones,
      emergency_contact_name: primaryEmergencyContact?.name || "",
      emergency_contact_relationship:
        primaryEmergencyContact?.relationship || "",
      emergency_contact_phone: primaryEmergencyContact?.phone_number || "",
      emergency_contacts: emergencyContacts,
      pcp: data.pcp ? Number(data.pcp) : null,
      referring_provider: data.referring_provider
        ? Number(data.referring_provider)
        : null,
      preferred_pharmacy: data.preferred_pharmacy
        ? Number(data.preferred_pharmacy)
        : null,
      is_active: data.is_active,
    };

    if (normalizedSsn || displayedMode !== "edit") {
      payload.ssn = normalizedSsn;
      payload.ssn_last4 = normalizedSsn
        ? normalizedSsn.slice(-4)
        : data.ssn_last4.trim();
    }

    try {
      setSubmitError("");
      const savedPatient =
        displayedMode === "edit" && displayedPatient?.id
          ? await updatePatient(
              displayedPatient.id,
              payload,
              displayedFacilityId
            )
          : await createPatient(payload, displayedFacilityId);

      onSaved?.(savedPatient as PatientRecord);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Failed to save patient."));
    }
  };

  const handleToggleSsn = async () => {
    if (showFullSsn) {
      setShowFullSsn(false);
      setSsnHint("");
      return;
    }

    if (displayedPatient?.id && displayedPatient?.ssn_last4 && !watchedSsn) {
      try {
        setSubmitError("");
        const response = await revealPatientSsn(
          displayedPatient.id,
          displayedFacilityId
        );
        const nextSsn = getSsnInputDigits(response?.ssn || "");
        if (nextSsn.length !== 9) {
          setValue("ssn", "", { shouldDirty: false });
          setSsnHint(
            "Stored full SSN is unavailable; enter the full SSN to replace it."
          );
        } else {
          setRevealedSsn(nextSsn);
          setSsnHint("");
          setValue("ssn", formatSsnInput(nextSsn), { shouldDirty: false });
        }
      } catch (error) {
        setSubmitError(getErrorMessage(error, "Failed to reveal SSN."));
        return;
      }
    }

    setShowFullSsn(true);
  };

  return (
    <div
      className={`cf-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-3 py-3 sm:px-4 sm:py-4 ${
        isClosing ? "is-closing" : "is-opening"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={displayedMode === "create" ? "New Patient" : "Edit Patient"}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        style={modalStyle}
        className={`cf-modal-panel fixed flex max-h-[min(94dvh,1040px)] w-[min(1400px,96vw)] flex-col overflow-hidden rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)] ${
          isClosing ? "is-closing" : "is-opening"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <PatientModalHeader
            dragHandleProps={dragHandleProps}
            mode={displayedMode}
            onClose={onClose}
            patientInitials={patientInitials}
          />

          <div className="flex flex-1 min-h-0 bg-cf-surface">
            {/* Left Rail (Step Selection) */}
            <RegistrationRail
              steps={registrationSteps}
              activeStep={activeStep}
              onStepClick={setActiveStep}
              errors={errors}
            />

            {/* Middle Content (Form fields for current step) */}
            <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 bg-cf-surface">
              {submitError ? (
                <Notice
                  tone="danger"
                  title="Patient was not saved"
                  className="mb-5"
                >
                  {submitError}
                </Notice>
              ) : null}

              {/* Mobile steps horizontal mini-tabs */}
              <div className="flex md:hidden items-center justify-between border-b border-cf-border bg-cf-surface-muted/40 px-4 py-3 mb-5 -mx-6 lg:-mx-8">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-cf-text">
                    Step {getCurrentStepNumber(activeStep)} of 5:
                  </span>
                  <span className="text-xs text-cf-text-muted font-medium">
                    {getCurrentStepTitle(activeStep)}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {registrationSteps.map((step) => {
                    const isActive = step.key === activeStep;
                    const hasError = getStepErrors(step.key, errors);
                    return (
                      <button
                        type="button"
                        key={step.key}
                        onClick={() => setActiveStep(step.key)}
                        className={[
                          "h-2 rounded-full cursor-pointer transition-all",
                          isActive
                            ? "bg-cf-accent w-4"
                            : hasError
                              ? "bg-cf-danger-text w-2"
                              : step.complete
                                ? "bg-cf-success-text/75 w-2"
                                : "bg-cf-border w-2",
                        ].join(" ")}
                        aria-label={`Go to ${step.label}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Step Header (Desktop) */}
              <div className="hidden md:block mb-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                      Step {getCurrentStepNumber(activeStep)} of 5
                    </span>
                    <h3 className="mt-0.5 text-lg font-semibold text-cf-text">
                      {getCurrentStepTitle(activeStep)}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-cf-text">
                      {completionPercent}%
                    </span>
                    <span className="ml-1.5 text-xs text-cf-text-muted">
                      intake complete
                    </span>
                  </div>
                </div>
                {/* Clean progress bar */}
                <div className="mt-2.5 h-1 w-full rounded-full bg-cf-surface-soft overflow-hidden">
                  <div
                    className="h-full bg-cf-accent rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              {/* Render Active Step Form */}
              <div className="space-y-6">
                {activeStep === "identity" && (
                  <PatientIdentityPanel
                    errors={errors}
                    handleToggleSsn={handleToggleSsn}
                    maskedSsn={maskedSsn}
                    patient={displayedPatient}
                    register={register}
                    registerSsnField={registerSsnField}
                    shouldEditSsn={shouldEditSsn}
                    ssnHint={ssnHint}
                    showFullSsn={showFullSsn}
                    tone="flat"
                  />
                )}

                {activeStep === "contact" && (
                  <PatientContactPanel
                    errors={errors}
                    mode={displayedMode}
                    register={register}
                    registerPhoneField={registerPhoneField}
                    tone="flat"
                  />
                )}

                {activeStep === "address" && (
                  <PatientAddressPanel register={register} tone="flat" />
                )}

                {activeStep === "clinical" && (
                  <div className="grid gap-6 md:grid-cols-2">
                    <PatientClinicalProfilePanel
                      errors={errors}
                      ethnicityDeclined={ethnicityDeclined}
                      genderOptions={genderOptions}
                      preferredLanguageDeclined={preferredLanguageDeclined}
                      raceDeclined={raceDeclined}
                      register={register}
                      tone="flat"
                    />

                    <PatientCareTeamPanel
                      careProviders={careProviders}
                      register={register}
                      tone="flat"
                    />
                  </div>
                )}

                {activeStep === "contacts" && (
                  <PatientEmergencyContactsSection
                    appendEmergencyContact={appendEmergencyContact}
                    editingEmergencyContactIndex={editingEmergencyContactIndex}
                    emergencyContactFields={emergencyContactFields}
                    errors={errors}
                    primaryEmergencyContactIndex={primaryEmergencyContactIndex}
                    register={register}
                    registerPhoneField={registerPhoneField}
                    removeEmergencyContact={removeEmergencyContact}
                    setEditingEmergencyContactIndex={
                      setEditingEmergencyContactIndex
                    }
                    setPrimaryEmergencyContactIndex={
                      setPrimaryEmergencyContactIndex
                    }
                    watchedEmergencyContacts={watchedEmergencyContacts}
                    tone="flat"
                  />
                )}
              </div>
            </div>

            {/* Right Summary Lens */}
            <RegistrationLens
              patientName={patientName}
              patientInitials={patientInitials}
              patient={displayedPatient}
              values={watchedValues}
              maskedSsn={maskedSsn}
              careProviders={careProviders}
              primaryEmergencyContact={primaryEmergencyContact}
            />
          </div>

          <div className="flex items-center justify-between border-t border-cf-border px-6 py-4 bg-cf-surface">
            <div>
              <Button type="button" onClick={onClose} variant="default">
                Cancel
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleBack}
                disabled={activeIndex === 0}
                variant="default"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={activeIndex === STEP_ORDER.length - 1}
                variant="default"
              >
                Next
              </Button>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isSubmitting || !displayedFacilityId}
                variant="primary"
              >
                {isSubmitting
                  ? "Saving…"
                  : displayedMode === "edit"
                    ? "Save Changes"
                    : "Create Patient"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
