import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  createPatient,
  revealPatientSsn,
  updatePatient,
} from "../api/patients";
import { Button, Notice } from "../../../shared/components/ui";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";
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
  RegistrationProgressRibbon,
  RegistrationRail,
  buildRegistrationSteps,
} from "./PatientRegistrationProgress";
import {
  formatPhoneInput,
  formatSsnInput,
  getPhoneInputDigits,
  getSsnInputDigits,
  handleFormattedInputDeletion,
} from "../utils/contactValidation";

export default function PatientModal({
  isOpen,
  mode,
  patient,
  facilityId,
  genderOptions,
  careProviders = [],
  onClose,
  onSaved,
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
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
  const [primaryEmergencyContactIndex, setPrimaryEmergencyContactIndex] =
    useState(0);
  const [editingEmergencyContactIndex, setEditingEmergencyContactIndex] =
    useState(null);
  const [showFullSsn, setShowFullSsn] = useState(false);
  const [revealedSsn, setRevealedSsn] = useState("");
  const watchedValues = watch();
  const watchedEmergencyContacts = watch("emergency_contacts") || [];
  const watchedSsn = watch("ssn") || "";
  const raceDeclined = watch("race_declined");
  const ethnicityDeclined = watch("ethnicity_declined");
  const preferredLanguageDeclined = watch("preferred_language_declined");
  const ssnDisplayValue = watchedSsn || revealedSsn;
  const hasStoredSsn = Boolean(patient?.ssn_last4 || ssnDisplayValue);
  const maskedSsn = getMaskedSsn(ssnDisplayValue, patient?.ssn_last4);
  const shouldEditSsn = showFullSsn || !hasStoredSsn;
  const registrationSteps = buildRegistrationSteps(watchedValues);
  const completionPercent = Math.round(
    (registrationSteps.filter((step) => step.complete).length /
      registrationSteps.length) *
      100
  );
  const patientName = getPatientName(watchedValues, patient);
  const patientInitials = getPatientInitials(watchedValues, patient);
  const primaryEmergencyContact =
    watchedEmergencyContacts[primaryEmergencyContactIndex] ||
    watchedEmergencyContacts[0] ||
    null;

  const { modalRef, modalStyle, dragHandleProps } = useDraggableModal({
    isOpen,
  });

  const registerFormattedField = (
    name,
    formatInput,
    normalizeValue,
    options = {}
  ) => {
    const registration = register(name, {
      ...options,
      setValueAs: normalizeValue,
    });
    return {
      ...registration,
      onChange: (event) => {
        event.target.value = formatInput(event.target.value);
        registration.onChange(event);
      },
      onKeyDown: (event) =>
        handleFormattedInputDeletion(event, formatInput, (nextValue) => {
          event.target.value = nextValue;
          registration.onChange(event);
        }),
    };
  };

  const registerPhoneField = (name, options = {}) =>
    registerFormattedField(
      name,
      formatPhoneInput,
      getPhoneInputDigits,
      options
    );

  const registerSsnField = (name, options = {}) =>
    registerFormattedField(name, formatSsnInput, getSsnInputDigits, options);

  useEffect(() => {
    if (!isOpen) return;

    const emergencyContacts = getEmergencyContacts(patient).map((contact) => ({
      ...contact,
      phone_number: formatPhoneInput(contact.phone_number),
    }));
    const primaryIndex = Math.max(
      0,
      emergencyContacts.findIndex((contact) => contact.is_primary)
    );

    reset({
      first_name: patient?.first_name || "",
      middle_name: patient?.middle_name || "",
      last_name: patient?.last_name || "",
      preferred_name: patient?.preferred_name || "",
      date_of_birth: patient?.date_of_birth || "",
      gender: patient?.gender || "",
      sex_at_birth: patient?.sex_at_birth || "",
      race: patient?.race || "",
      race_declined: patient?.race_declined || false,
      ethnicity: patient?.ethnicity || "",
      ethnicity_declined: patient?.ethnicity_declined || false,
      preferred_language: patient?.preferred_language || "",
      preferred_language_declined:
        patient?.preferred_language_declined || false,
      pronouns: patient?.pronouns || "",
      email: patient?.email || "",
      address_line_1: patient?.address?.line_1 || "",
      address_line_2: patient?.address?.line_2 || "",
      address_city: patient?.address?.city || "",
      address_state: patient?.address?.state || "NY",
      address_zip_code: patient?.address?.zip_code || "",
      phone_cell: formatPhoneInput(getPhoneNumberByLabel(patient, "cell")),
      phone_home: formatPhoneInput(getPhoneNumberByLabel(patient, "home")),
      phone_work: formatPhoneInput(getPhoneNumberByLabel(patient, "work")),
      emergency_contact_name: patient?.emergency_contact_name || "",
      emergency_contact_relationship:
        patient?.emergency_contact_relationship || "",
      emergency_contact_phone: formatPhoneInput(
        patient?.emergency_contact_phone
      ),
      emergency_contacts: emergencyContacts,
      ssn: "",
      ssn_last4: patient?.ssn_last4 || "",
      pcp: patient?.pcp || "",
      referring_provider: patient?.referring_provider || "",
      preferred_pharmacy: patient?.preferred_pharmacy || "",
      is_active: patient?.is_active ?? true,
    });
    setPrimaryEmergencyContactIndex(primaryIndex === -1 ? 0 : primaryIndex);
    setEditingEmergencyContactIndex(null);
    setShowFullSsn(false);
    setRevealedSsn("");
    setSubmitError("");
  }, [isOpen, patient, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data) => {
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

    const payload = {
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

    if (normalizedSsn || mode !== "edit") {
      payload.ssn = normalizedSsn;
      payload.ssn_last4 = normalizedSsn
        ? normalizedSsn.slice(-4)
        : data.ssn_last4.trim();
    }

    try {
      setSubmitError("");
      const savedPatient =
        mode === "edit" && patient?.id
          ? await updatePatient(patient.id, payload, facilityId)
          : await createPatient(payload, facilityId);

      onSaved?.(savedPatient);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Failed to save patient."));
    }
  };

  const handleToggleSsn = async () => {
    if (showFullSsn) {
      setShowFullSsn(false);
      return;
    }

    if (patient?.id && patient?.ssn_last4 && !watchedSsn) {
      try {
        setSubmitError("");
        const response = await revealPatientSsn(patient.id, facilityId);
        const nextSsn = getSsnInputDigits(response.ssn || "");
        setRevealedSsn(nextSsn);
        setValue("ssn", formatSsnInput(nextSsn), { shouldDirty: false });
      } catch (error) {
        setSubmitError(getErrorMessage(error, "Failed to reveal SSN."));
        return;
      }
    }

    setShowFullSsn(true);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-3 py-3 sm:px-4 sm:py-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="fixed flex max-h-[min(94dvh,1040px)] w-[min(1400px,96vw)] flex-col rounded-[1.75rem] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <PatientModalHeader
            completionPercent={completionPercent}
            dragHandleProps={dragHandleProps}
            mode={mode}
            onClose={onClose}
            patient={patient}
            patientInitials={patientInitials}
            patientName={patientName}
            watchedValues={watchedValues}
          />

          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-cf-page-bg to-cf-surface-muted/55 px-4 py-5 sm:px-6">
            <div className="mx-auto grid max-w-[1360px] gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
              <RegistrationRail steps={registrationSteps} />

              <div className="min-w-0 space-y-5">
                {submitError ? (
                  <Notice tone="danger" title="Patient was not saved">
                    {submitError}
                  </Notice>
                ) : null}

                <RegistrationProgressRibbon
                  steps={registrationSteps}
                  completionPercent={completionPercent}
                />

                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
                  <PatientIdentityPanel
                    errors={errors}
                    handleToggleSsn={handleToggleSsn}
                    maskedSsn={maskedSsn}
                    patient={patient}
                    register={register}
                    registerSsnField={registerSsnField}
                    shouldEditSsn={shouldEditSsn}
                    showFullSsn={showFullSsn}
                  />

                  <PatientContactPanel
                    errors={errors}
                    mode={mode}
                    register={register}
                    registerPhoneField={registerPhoneField}
                  />
                </div>

                <PatientAddressPanel register={register} />

                <div className="grid gap-5 lg:grid-cols-2">
                  <PatientClinicalProfilePanel
                    errors={errors}
                    ethnicityDeclined={ethnicityDeclined}
                    genderOptions={genderOptions}
                    preferredLanguageDeclined={preferredLanguageDeclined}
                    raceDeclined={raceDeclined}
                    register={register}
                  />

                  <PatientCareTeamPanel
                    careProviders={careProviders}
                    register={register}
                  />
                </div>

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
                />
              </div>

              <RegistrationLens
                patientName={patientName}
                patientInitials={patientInitials}
                patient={patient}
                values={watchedValues}
                maskedSsn={maskedSsn}
                careProviders={careProviders}
                primaryEmergencyContact={primaryEmergencyContact}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-cf-border px-6 py-4">
            <Button type="button" onClick={onClose} variant="default">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !facilityId}
              variant="primary"
            >
              {isSubmitting
                ? "Saving…"
                : mode === "edit"
                  ? "Save Changes"
                  : "Create Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
