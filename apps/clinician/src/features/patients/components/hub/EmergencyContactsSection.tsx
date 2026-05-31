import { useState } from "react";
import { Check, Plus, Siren, Trash2, X } from "lucide-react";

import { Badge, Button, Input } from "../../../../shared/components/ui";
import {
  formatPhoneDisplay,
  formatPhoneInput,
  getPhoneInputDigits,
  handleFormattedInputDeletion,
  PHONE_INPUT_PLACEHOLDER,
  validatePhoneNumber,
} from "../../utils/contactValidation";
import InlineEditField, { FIELD_BOX_CLASS } from "./InlineEditField";
import { RegistrationSectionShell } from "./RegistrationSectionShell";

import type { ChangeEvent, KeyboardEvent } from "react";
import type { EmergencyContactFormValues } from "../../types";

type EmergencyContactPatch = Partial<EmergencyContactFormValues>;

type EmergencyContactsSectionProps = {
  contacts?: EmergencyContactFormValues[] | null;
  saving?: boolean;
  onSaveContacts: (
    contacts: EmergencyContactFormValues[]
  ) => Promise<void> | void;
};

type ContactRowProps = {
  contact: EmergencyContactFormValues;
  saving: boolean;
  onPatch: (patch: EmergencyContactPatch) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
};

type AddContactRowProps = {
  saving: boolean;
  onSave: (contact: EmergencyContactFormValues) => Promise<void> | void;
  onCancel: () => void;
};

const EMPTY_CONTACT: EmergencyContactFormValues = {
  name: "",
  relationship: "",
  phone_number: "",
  notes: "",
  is_primary: false,
};

const MAX_CONTACTS = 5;

function normalizeContact(
  contact: Partial<EmergencyContactFormValues> = {},
  index = 0
): EmergencyContactFormValues {
  return {
    name: contact.name || "",
    relationship: contact.relationship || "",
    phone_number: getPhoneInputDigits(contact.phone_number || ""),
    notes: contact.notes || "",
    is_primary: Boolean(contact.is_primary || index === 0),
  };
}

function normalizeContacts(
  contacts: EmergencyContactFormValues[] | null | undefined = []
): EmergencyContactFormValues[] {
  const cleaned = (contacts ?? [])
    .map(normalizeContact)
    .filter((contact) =>
      [
        contact.name,
        contact.relationship,
        contact.phone_number,
        contact.notes,
      ].some((value) => String(value || "").trim())
    );

  if (!cleaned.length) return [];
  if (cleaned.some((contact) => contact.is_primary)) return cleaned;
  return cleaned.map((contact, index) => ({
    ...contact,
    is_primary: index === 0,
  }));
}

function ContactRow({ contact, saving, onPatch, onRemove }: ContactRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <InlineEditField
          value={contact.name}
          placeholder="Full name"
          onSave={(next) => onPatch({ name: String(next ?? "").trim() })}
        />
      </div>
      <div className="min-w-0 flex-1">
        <InlineEditField
          value={contact.relationship}
          placeholder="Relationship"
          onSave={(next) =>
            onPatch({ relationship: String(next ?? "").trim() })
          }
        />
      </div>
      <div className="min-w-0 flex-1">
        <InlineEditField
          value={contact.phone_number}
          displayValue={
            contact.phone_number ? formatPhoneDisplay(contact.phone_number) : ""
          }
          displayTitle={
            contact.phone_number ? formatPhoneDisplay(contact.phone_number) : ""
          }
          placeholder={PHONE_INPUT_PLACEHOLDER}
          inputMode="numeric"
          sanitizeInput={formatPhoneInput}
          onFormattedKeyDown={(event, updateDraft) =>
            handleFormattedInputDeletion(event, formatPhoneInput, updateDraft)
          }
          onSave={(next) =>
            onPatch({ phone_number: getPhoneInputDigits(next) })
          }
          validate={(next) => {
            const trimmed = String(next || "").trim();
            if (!trimmed) return null;
            return validatePhoneNumber(trimmed);
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <InlineEditField
          value={contact.notes}
          placeholder="Notes"
          onSave={(next) => onPatch({ notes: String(next ?? "").trim() })}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={saving}
        aria-label="Remove contact"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cf-border text-cf-text-subtle transition hover:border-cf-danger-text/40 hover:bg-cf-danger-bg hover:text-cf-danger-text"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddContactRow({ saving, onSave, onCancel }: AddContactRowProps) {
  const [draft, setDraft] = useState({ ...EMPTY_CONTACT });
  const [error, setError] = useState("");

  const updateDraft = (
    key: keyof EmergencyContactFormValues,
    value: string
  ) => {
    setError("");
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!draft.name.trim() && !draft.phone_number.trim()) {
      setError("Add at least a name or phone number.");
      return;
    }
    const phoneError = validatePhoneNumber(draft.phone_number);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    await onSave(draft);
  };

  return (
    <div className="rounded-lg border border-dashed border-cf-border-strong bg-cf-surface-muted/45 p-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={draft.name}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateDraft("name", event.target.value)
            }
            placeholder="Full name"
            className={["h-9 py-0", FIELD_BOX_CLASS].join(" ")}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={draft.relationship}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateDraft("relationship", event.target.value)
            }
            placeholder="Relationship"
            className={["h-9 py-0", FIELD_BOX_CLASS].join(" ")}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={draft.phone_number}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateDraft("phone_number", formatPhoneInput(event.target.value))
            }
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) =>
              handleFormattedInputDeletion(
                event,
                formatPhoneInput,
                (nextValue) => updateDraft("phone_number", nextValue)
              )
            }
            placeholder={PHONE_INPUT_PLACEHOLDER}
            inputMode="numeric"
            className={["h-9 py-0", FIELD_BOX_CLASS].join(" ")}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={draft.notes}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateDraft("notes", event.target.value)
            }
            placeholder="Notes"
            className={["h-9 py-0", FIELD_BOX_CLASS].join(" ")}
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          aria-label="Save contact"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cf-border text-cf-text-muted transition hover:border-cf-success-text/40 hover:bg-cf-success-bg hover:text-cf-success-text"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Cancel"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cf-border text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 px-0.5 text-[11px] text-cf-danger-text">{error}</p>
      ) : null}
    </div>
  );
}

export default function EmergencyContactsSection({
  contacts = [],
  saving = false,
  onSaveContacts,
}: EmergencyContactsSectionProps) {
  const normalizedContacts = normalizeContacts(contacts);
  const [showAdd, setShowAdd] = useState(false);

  const commitContacts = async (nextContacts: EmergencyContactFormValues[]) => {
    await onSaveContacts(normalizeContacts(nextContacts));
  };

  const updateContact = (targetIndex: number, patch: EmergencyContactPatch) =>
    commitContacts(
      normalizedContacts.map((contact, index) =>
        index === targetIndex ? { ...contact, ...patch } : contact
      )
    );

  const addContact = async (contact: EmergencyContactFormValues) => {
    const nextContact = normalizeContact(contact, normalizedContacts.length);
    await commitContacts(
      contact.is_primary
        ? [
            ...normalizedContacts.map((item) => ({
              ...item,
              is_primary: false,
            })),
            nextContact,
          ]
        : [...normalizedContacts, nextContact]
    );
    setShowAdd(false);
  };

  const removeContact = (targetIndex: number) =>
    commitContacts(
      normalizedContacts.filter((_, index) => index !== targetIndex)
    );

  const canAdd = normalizedContacts.length < MAX_CONTACTS;
  const isMissing = normalizedContacts.length === 0;

  return (
    <RegistrationSectionShell
      icon={Siren}
      title="Emergency contacts"
      badge={isMissing ? <Badge variant="warning">Required</Badge> : null}
    >
      {isMissing && !showAdd ? (
        <div className="rounded-2xl border border-dashed border-cf-warning-text/35 bg-cf-warning-bg px-4 py-4">
          <div className="text-sm font-semibold text-cf-warning-text">
            No emergency contact on file.
          </div>
          <p className="mt-0.5 text-xs text-cf-warning-text/80">
            Required before the next visit. Add at least one person to reach
            during an emergency.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add first contact
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {normalizedContacts.length > 0 ? (
            <div className="flex items-center gap-2 px-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <div className="min-w-0 flex-1">Name</div>
              <div className="min-w-0 flex-1">Relationship</div>
              <div className="min-w-0 flex-1">Phone</div>
              <div className="min-w-0 flex-1">Notes</div>
              <div className="w-9 shrink-0" />
            </div>
          ) : null}
          {normalizedContacts.map((contact, index) => (
            <ContactRow
              key={`${contact.name}-${contact.phone_number}-${index}`}
              contact={contact}
              saving={saving}
              onPatch={(patch) => updateContact(index, patch)}
              onRemove={() => removeContact(index)}
            />
          ))}

          {showAdd ? (
            <AddContactRow
              saving={saving}
              onSave={addContact}
              onCancel={() => setShowAdd(false)}
            />
          ) : canAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-cf-border bg-cf-surface-muted/45 px-3 py-2.5 text-xs font-semibold text-cf-text-subtle transition hover:border-cf-border-strong hover:bg-cf-surface-muted hover:text-cf-text"
            >
              <Plus className="h-3.5 w-3.5" />
              Add another contact
            </button>
          ) : null}
        </div>
      )}
    </RegistrationSectionShell>
  );
}
