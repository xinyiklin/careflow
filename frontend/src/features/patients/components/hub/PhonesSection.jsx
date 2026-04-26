import { Star } from "lucide-react";

import {
  formatPhoneInput,
  getPhoneInputDigits,
  handleFormattedInputDeletion,
  validatePhoneNumber,
} from "../../utils/contactValidation";
import InlineEditField from "./InlineEditField";

const PHONE_LABELS = [
  { label: "cell", title: "Cell" },
  { label: "home", title: "Home" },
  { label: "work", title: "Work" },
];

function getPhoneByLabel(phones, label) {
  return (phones || []).find((phone) => phone.label === label) || null;
}

function ensurePrimaryAssigned(phones) {
  if (!phones.length) return phones;
  if (phones.some((phone) => phone.is_primary)) return phones;
  return phones.map((phone, index) => ({
    ...phone,
    is_primary: index === 0,
  }));
}

function buildPhonesPatch(currentPhones, label, nextNumber) {
  const trimmed = getPhoneInputDigits(nextNumber);
  const others = (currentPhones || []).filter((phone) => phone.label !== label);
  const existing = getPhoneByLabel(currentPhones, label);

  if (!trimmed) {
    return ensurePrimaryAssigned(others);
  }

  const updated = {
    label,
    number: trimmed,
    is_primary: existing?.is_primary || false,
  };

  return ensurePrimaryAssigned([...others, updated]);
}

function buildPrimaryPatch(currentPhones, label) {
  return (currentPhones || []).map((phone) => ({
    ...phone,
    is_primary: phone.label === label,
  }));
}

function isFinalPhone(phones, label) {
  const remaining = (phones || []).filter(
    (phone) => phone.label !== label && (phone.number || "").trim()
  );
  return remaining.length === 0;
}

export default function PhonesSection({ phones = [], onSavePhones }) {
  const cellPhone = getPhoneByLabel(phones, "cell");
  const primaryLabel = (phones || []).find((phone) => phone.is_primary)?.label;

  const handleSavePhone = async (label, nextNumber) => {
    const trimmed = getPhoneInputDigits(nextNumber);
    if (!trimmed && isFinalPhone(phones, label)) {
      throw new Error("At least one phone number is required.");
    }
    const next = buildPhonesPatch(phones, label, nextNumber);
    await onSavePhones(next);
  };

  const handleMakePrimary = async (label) => {
    const next = buildPrimaryPatch(phones, label);
    await onSavePhones(next);
  };

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
      {PHONE_LABELS.map(({ label, title }) => {
        const phone = getPhoneByLabel(phones, label);
        const isPrimary = primaryLabel === label;
        const value = getPhoneInputDigits(phone?.number || "");
        const showPrimaryToggle = Boolean(value) && !isPrimary;

        return (
          <div key={label} className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                {title}
                {isPrimary ? (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-cf-accent-soft px-1.5 py-0.5 text-[9px] font-semibold text-cf-text">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Primary
                  </span>
                ) : null}
              </div>
              {showPrimaryToggle ? (
                <button
                  type="button"
                  onClick={() => handleMakePrimary(label)}
                  className="text-[10px] font-semibold text-cf-text-subtle hover:text-cf-text"
                >
                  Make primary
                </button>
              ) : null}
            </div>
            <InlineEditField
              type="text"
              inputMode="numeric"
              sanitizeInput={formatPhoneInput}
              onFormattedKeyDown={(event, updateDraft) =>
                handleFormattedInputDeletion(
                  event,
                  formatPhoneInput,
                  updateDraft
                )
              }
              value={value}
              displayValue={value ? formatPhoneInput(value) : ""}
              placeholder="(555)555-1234"
              onSave={(next) => handleSavePhone(label, next)}
              validate={(next) => {
                const trimmed = String(next || "").trim();
                if (!trimmed) return null;
                return validatePhoneNumber(trimmed);
              }}
            />
          </div>
        );
      })}

      {cellPhone || phones.length === 0 ? null : (
        <p className="md:col-span-2 text-[11px] text-cf-text-muted">
          No cell phone on file. Add one to enable SMS reminders.
        </p>
      )}
    </div>
  );
}
