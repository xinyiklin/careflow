// Re-export shared phone primitives so existing imports keep working.
export {
  PHONE_DIGIT_LIMIT,
  PHONE_INPUT_PLACEHOLDER,
  getDigits,
  getCappedDigits,
  getPhoneInputDigits,
  formatPhoneInput,
  formatPhoneDisplay,
  validatePhoneNumber,
  getFormattedBackspaceValue,
  getFormattedDeleteValue,
  handleFormattedInputDeletion,
} from "../../../shared/utils/phone";

import {
  getDigits,
  getCappedDigits,
  formatPhoneDisplay,
} from "../../../shared/utils/phone";

export const SSN_DIGIT_LIMIT = 9;
export const PHONE_LABEL_ORDER = ["cell", "home", "work"] as const;
export const PHONE_LABEL_TITLES = {
  cell: "Cell",
  home: "Home",
  work: "Work",
};

type PhoneLabel = (typeof PHONE_LABEL_ORDER)[number] | string;

type PhoneEntryInput = {
  label?: PhoneLabel | null;
  number?: string | number | null;
  phone_number?: string | number | null;
  is_primary?: boolean | null;
};

export type NormalizedPhoneEntry = {
  label: string;
  labelTitle: string;
  number: string;
  formattedNumber: string;
  is_primary: boolean;
};

type PatientPhoneValues = {
  phones?: PhoneEntryInput[] | null;
  primary_phone_label?: string | null;
  primary_phone_number?: string | number | null;
  phone_cell?: string | number | null;
  phone_home?: string | number | null;
  phone_work?: string | number | null;
};

function isNormalizedPhoneEntry(
  phone: NormalizedPhoneEntry | null
): phone is NormalizedPhoneEntry {
  return phone !== null;
}

export function getSsnInputDigits(value: unknown): string {
  return getCappedDigits(value, SSN_DIGIT_LIMIT);
}

export function getPhoneLabelTitle(label: unknown): string {
  const normalized = String(label || "")
    .trim()
    .toLowerCase();
  return (
    PHONE_LABEL_TITLES[normalized as keyof typeof PHONE_LABEL_TITLES] || "Phone"
  );
}

function getPhoneSortRank(phone: NormalizedPhoneEntry): number {
  const primaryRank = phone.is_primary ? 0 : 1;
  const labelRank = PHONE_LABEL_ORDER.findIndex(
    (label) => label === phone.label
  );
  return primaryRank * 10 + (labelRank === -1 ? 9 : labelRank);
}

function normalizePhoneEntry(
  entry: PhoneEntryInput | null | undefined
): NormalizedPhoneEntry | null {
  const number = String(entry?.number || entry?.phone_number || "").trim();
  if (!number) return null;

  const label = String(entry?.label || "")
    .trim()
    .toLowerCase();
  return {
    label,
    labelTitle: getPhoneLabelTitle(label),
    number,
    formattedNumber: formatPhoneDisplay(number),
    is_primary: Boolean(entry?.is_primary),
  };
}

export function getPatientPhoneEntries(
  patientOrValues?: PatientPhoneValues | null
): NormalizedPhoneEntry[] {
  const values = patientOrValues || {};
  const phones = Array.isArray(values.phones)
    ? values.phones.map(normalizePhoneEntry).filter(isNormalizedPhoneEntry)
    : PHONE_LABEL_ORDER.map((label) =>
        normalizePhoneEntry({
          label,
          number: values[`phone_${label}`],
          is_primary: label === "cell",
        })
      ).filter(isNormalizedPhoneEntry);

  if (!phones.length && values.primary_phone_number) {
    const primaryPhone = normalizePhoneEntry({
      label: values.primary_phone_label || "primary",
      number: values.primary_phone_number,
      is_primary: true,
    });

    if (primaryPhone) {
      phones.push(primaryPhone);
    }
  }

  const seen = new Set();
  return phones
    .filter((phone) => {
      const key = getDigits(phone.number) || phone.number;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => getPhoneSortRank(a) - getPhoneSortRank(b));
}

export function formatPhoneEntryDisplay(
  phone?: NormalizedPhoneEntry | null
): string {
  if (!phone) return "";
  return `${phone.labelTitle} ${phone.formattedNumber}`;
}

export function getPrimaryPatientPhoneDisplay(
  patientOrValues?: PatientPhoneValues | null
): string {
  const [primaryPhone] = getPatientPhoneEntries(patientOrValues);
  return formatPhoneEntryDisplay(primaryPhone);
}

export function formatSsnInput(value: unknown): string {
  const digits = getSsnInputDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits}-`;
  if (digits.length <= 4) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 5) return `${digits.slice(0, 3)}-${digits.slice(3)}-`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function validateSsn(value: unknown): string | null {
  const digits = getDigits(value);
  if (!digits) return null;
  return digits.length === 9 ? null : "SSN must be exactly 9 digits.";
}
