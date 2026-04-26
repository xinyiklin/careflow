import { useState } from "react";
import { Plus, Siren, Star, Trash2 } from "lucide-react";

import { Badge, Button, Input } from "../../../../shared/components/ui";
import {
  formatPhoneInput,
  getPhoneInputDigits,
  handleFormattedInputDeletion,
  validatePhoneNumber,
} from "../../utils/contactValidation";
import InlineEditField from "./InlineEditField";
import { RegistrationSectionShell } from "./RegistrationSectionShell";

const EMPTY_CONTACT = {
  name: "",
  relationship: "",
  phone_number: "",
  notes: "",
  is_primary: false,
};

const MAX_CONTACTS = 3;

function normalizeContact(contact = {}, index = 0) {
  return {
    name: contact.name || "",
    relationship: contact.relationship || "",
    phone_number: getPhoneInputDigits(contact.phone_number || ""),
    notes: contact.notes || "",
    is_primary: Boolean(contact.is_primary || index === 0),
  };
}

function normalizeContacts(contacts = []) {
  const cleaned = contacts
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

function ContactRow({
  contact,
  index,
  saving,
  onPatch,
  onRemove,
  onSetPrimary,
}) {
  const isPrimary = Boolean(contact.is_primary);

  return (
    <div className="rounded-2xl border border-cf-border bg-cf-surface-soft/55 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle">
            <Siren className="h-3.5 w-3.5" />
          </span>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            Contact {index + 1}
          </div>
          {isPrimary ? (
            <Badge variant="success">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Primary
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {!isPrimary ? (
            <Button
              size="sm"
              variant="default"
              onClick={onSetPrimary}
              disabled={saving}
            >
              <Star className="h-3.5 w-3.5" />
              Make primary
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="default"
            onClick={onRemove}
            disabled={saving}
            className="text-cf-danger-text hover:bg-cf-danger-bg"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0 md:grid-cols-3">
        <InlineEditField
          label="Name"
          value={contact.name}
          placeholder="Full name"
          onSave={(next) => onPatch({ name: next.trim() })}
        />
        <InlineEditField
          label="Relationship"
          value={contact.relationship}
          placeholder="Spouse, parent, friend…"
          onSave={(next) => onPatch({ relationship: next.trim() })}
        />
        <InlineEditField
          label="Phone"
          value={contact.phone_number}
          displayValue={
            contact.phone_number ? formatPhoneInput(contact.phone_number) : ""
          }
          placeholder="(555)555-1234"
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
    </div>
  );
}

function AddContactRow({ index, saving, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    ...EMPTY_CONTACT,
    is_primary: index === 0,
  });
  const [error, setError] = useState("");

  const updateDraft = (key, value) => {
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
    <div className="rounded-2xl border-2 border-dashed border-cf-border-strong bg-cf-surface-muted/45 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
          New contact
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-cf-text-muted">
          <input
            type="checkbox"
            checked={draft.is_primary}
            onChange={(event) =>
              updateDraft("is_primary", event.target.checked)
            }
            className="h-3.5 w-3.5 rounded border-cf-border-strong"
          />
          Primary contact
        </label>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          value={draft.name}
          onChange={(event) => updateDraft("name", event.target.value)}
          placeholder="Full name"
          className="h-9 py-0"
        />
        <Input
          value={draft.relationship}
          onChange={(event) => updateDraft("relationship", event.target.value)}
          placeholder="Spouse, parent, friend…"
          className="h-9 py-0"
        />
        <Input
          value={draft.phone_number}
          onChange={(event) =>
            updateDraft("phone_number", formatPhoneInput(event.target.value))
          }
          onKeyDown={(event) =>
            handleFormattedInputDeletion(event, formatPhoneInput, (nextValue) =>
              updateDraft("phone_number", nextValue)
            )
          }
          placeholder="(555)555-1234"
          inputMode="numeric"
          className="h-9 py-0"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {error ? (
          <p className="text-xs text-cf-danger-text">{error}</p>
        ) : (
          <p className="text-[11px] text-cf-text-subtle">
            Required before next visit. Phone enables outreach if reached during
            an emergency.
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="default"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            Save contact
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyContactsSection({
  contacts = [],
  saving = false,
  onSaveContacts,
}) {
  const normalizedContacts = normalizeContacts(contacts);
  const [showAdd, setShowAdd] = useState(false);

  const commitContacts = async (nextContacts) => {
    await onSaveContacts(normalizeContacts(nextContacts));
  };

  const updateContact = (targetIndex, patch) =>
    commitContacts(
      normalizedContacts.map((contact, index) =>
        index === targetIndex ? { ...contact, ...patch } : contact
      )
    );

  const addContact = async (contact) => {
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

  const removeContact = (targetIndex) =>
    commitContacts(
      normalizedContacts.filter((_, index) => index !== targetIndex)
    );

  const setPrimary = (targetIndex) =>
    commitContacts(
      normalizedContacts.map((contact, index) => ({
        ...contact,
        is_primary: index === targetIndex,
      }))
    );

  const canAdd = normalizedContacts.length < MAX_CONTACTS;
  const isMissing = normalizedContacts.length === 0;

  return (
    <RegistrationSectionShell
      icon={Siren}
      title="Emergency contacts"
      badge={
        <Badge variant={isMissing ? "warning" : "neutral"}>
          {isMissing
            ? "Required"
            : `${normalizedContacts.length} on file · max ${MAX_CONTACTS}`}
        </Badge>
      }
    >
      {isMissing && !showAdd ? (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 px-4 py-4">
          <div className="text-sm font-semibold text-amber-950">
            No emergency contact on file.
          </div>
          <p className="mt-0.5 text-xs text-amber-900/80">
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
          {normalizedContacts.map((contact, index) => (
            <ContactRow
              key={`${contact.name}-${contact.phone_number}-${index}`}
              contact={contact}
              index={index}
              saving={saving}
              onPatch={(patch) => updateContact(index, patch)}
              onRemove={() => removeContact(index)}
              onSetPrimary={() => setPrimary(index)}
            />
          ))}

          {showAdd ? (
            <AddContactRow
              index={normalizedContacts.length}
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
          ) : (
            <p className="text-center text-[11px] text-cf-text-subtle">
              Maximum of {MAX_CONTACTS} emergency contacts reached.
            </p>
          )}
        </div>
      )}
    </RegistrationSectionShell>
  );
}
