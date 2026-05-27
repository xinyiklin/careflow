import { getPrimaryPatientPhoneDisplay } from "../utils/contactValidation";

import type {
  EmergencyContactFormValues,
  PatientCareProvider,
  PatientFormValues,
  PatientRecord,
} from "../types";

type SelectOption = {
  value: string;
  label: string;
};

export const SEX_AT_BIRTH_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "unknown", label: "Unknown" },
  { value: "undisclosed", label: "Undisclosed" },
] satisfies SelectOption[];

export const RACE_OPTIONS = [
  { value: "", label: "Not specified" },
  {
    value: "american_indian_or_alaska_native",
    label: "American Indian or Alaska Native",
  },
  { value: "asian", label: "Asian" },
  { value: "black_or_african_american", label: "Black or African American" },
  {
    value: "native_hawaiian_or_other_pacific_islander",
    label: "Native Hawaiian or Other Pacific Islander",
  },
  { value: "white", label: "White" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] satisfies SelectOption[];

export const ETHNICITY_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "hispanic_or_latino", label: "Hispanic or Latino" },
  { value: "not_hispanic_or_latino", label: "Not Hispanic or Latino" },
  { value: "unknown", label: "Unknown" },
] satisfies SelectOption[];

export const EMPTY_PATIENT_FORM_VALUES: PatientFormValues = {
  first_name: "",
  middle_name: "",
  last_name: "",
  preferred_name: "",
  date_of_birth: "",
  gender: "",
  sex_at_birth: "",
  race: "",
  race_declined: false,
  ethnicity: "",
  ethnicity_declined: false,
  preferred_language: "",
  preferred_language_declined: false,
  pronouns: "",
  email: "",
  address_line_1: "",
  address_line_2: "",
  address_city: "",
  address_state: "NY",
  address_zip_code: "",
  phone_cell: "",
  phone_home: "",
  phone_work: "",
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
  emergency_contacts: [],
  ssn: "",
  ssn_last4: "",
  pcp: "",
  referring_provider: "",
  preferred_pharmacy: "",
  is_active: true,
};

export const EMPTY_EMERGENCY_CONTACT: EmergencyContactFormValues = {
  name: "",
  relationship: "",
  phone_number: "",
  is_primary: true,
  notes: "",
};

export function getProviderLabel(provider: PatientCareProvider): string {
  return (
    provider.display_name ||
    [provider.first_name, provider.last_name].filter(Boolean).join(" ")
  );
}

export function getPhoneNumberByLabel(
  patient: PatientRecord | null | undefined,
  label: string
): string {
  const number = patient?.phones?.find(
    (phone) => phone.label === label
  )?.number;
  return number ? String(number) : "";
}

export function getEmergencyContacts(
  patient: PatientRecord | null | undefined
): EmergencyContactFormValues[] {
  const contacts = (patient?.emergency_contacts || []).map((contact) => ({
    name: contact.name || "",
    relationship: contact.relationship || "",
    phone_number: contact.phone_number || "",
    is_primary: contact.is_primary || false,
    notes: contact.notes || "",
  }));

  if (contacts.length) {
    return contacts.some((contact) => contact.is_primary)
      ? contacts
      : contacts.map((contact, index) => ({
          ...contact,
          is_primary: index === 0,
        }));
  }

  if (
    patient?.emergency_contact_name ||
    patient?.emergency_contact_relationship ||
    patient?.emergency_contact_phone
  ) {
    return [
      {
        name: patient.emergency_contact_name || "",
        relationship: patient.emergency_contact_relationship || "",
        phone_number: patient.emergency_contact_phone || "",
        is_primary: true,
        notes: "",
      },
    ];
  }

  return [{ ...EMPTY_EMERGENCY_CONTACT }];
}

export function getMaskedSsn(
  fullSsn: string | null | undefined,
  fallbackLast4?: string | null
): string {
  const digits = String(fullSsn || "").replace(/\D/g, "");
  const last4 = digits.slice(-4) || fallbackLast4 || "";

  return last4 ? `***-**-${last4}` : "Not recorded";
}

function getMiddleInitial(value: string | null | undefined): string {
  const trimmed = String(value || "").trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}.` : "";
}

export function getPatientName(
  values: Partial<PatientFormValues> | null | undefined,
  patient: PatientRecord | null | undefined
): string {
  const firstName = values?.first_name?.trim() || patient?.first_name || "";
  const middleName = values?.middle_name?.trim() || patient?.middle_name || "";
  const lastName = values?.last_name?.trim() || patient?.last_name || "";
  const preferredName =
    values?.preferred_name?.trim() || patient?.preferred_name || "";
  const givenName = [firstName, getMiddleInitial(middleName)]
    .filter(Boolean)
    .join(" ");
  const displayName = [lastName, givenName].filter(Boolean).join(", ");

  if (displayName && preferredName) return `${displayName} · ${preferredName}`;
  return displayName || preferredName || "New patient";
}

export function getPatientInitials(
  values: Partial<PatientFormValues> | null | undefined,
  patient: PatientRecord | null | undefined
): string {
  const initials = [
    values?.first_name || patient?.first_name,
    values?.last_name || patient?.last_name,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .charAt(0)
    )
    .filter(Boolean)
    .join("");

  return initials ? initials.slice(0, 2).toUpperCase() : "PT";
}

export function getPrimaryPhone(
  values: Partial<PatientFormValues> | null | undefined
): string {
  return getPrimaryPatientPhoneDisplay(values);
}

export function getAddressPreview(
  values: Partial<PatientFormValues> | null | undefined
): string {
  const cityStateZip = [
    values?.address_city,
    [values?.address_state, values?.address_zip_code].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [values?.address_line_1, values?.address_line_2, cityStateZip]
    .filter(Boolean)
    .join(" · ");
}

export function getProviderName(
  careProviders: PatientCareProvider[],
  providerId: string | number | null | undefined
): string {
  if (!providerId) return "";
  const provider = careProviders.find(
    (option) => String(option.id) === String(providerId)
  );
  return provider ? getProviderLabel(provider) : "";
}
