import { Check, Phone, Plus, Siren, Star, Trash2, X } from "lucide-react";

import { FieldError, FormLabel as Label } from "./PatientFormFields";
import { EMPTY_EMERGENCY_CONTACT } from "./patientModalData";
import { Badge, Button, Input, Panel } from "../../../shared/components/ui";
import { validatePhoneNumber } from "../utils/contactValidation";

function EmergencyContactEditor({
  contactPreview,
  emergencyContactFields,
  errors,
  index,
  isPrimary,
  onClose,
  register,
  registerPhoneField,
  removeEmergencyContact,
  setEditingEmergencyContactIndex,
  setPrimaryEmergencyContactIndex,
}) {
  const contactName = contactPreview?.name?.trim() || `Contact ${index + 1}`;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4 py-6"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="flex max-h-[min(86dvh,760px)] w-full max-w-3xl flex-col rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-cf-border bg-cf-surface-muted/60 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Emergency Contact
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-cf-text">
                {contactName}
              </h3>
              {isPrimary ? <Badge variant="success">Primary</Badge> : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
            aria-label="Close emergency contact editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                {...register(`emergency_contacts.${index}.name`)}
              />
            </div>

            <div>
              <Label>Relationship</Label>
              <Input
                type="text"
                {...register(`emergency_contacts.${index}.relationship`)}
              />
            </div>

            <div>
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cf-text-subtle" />
                <Input
                  type="text"
                  inputMode="numeric"
                  className="pl-9"
                  {...registerPhoneField(
                    `emergency_contacts.${index}.phone_number`,
                    {
                      validate: (value) => validatePhoneNumber(value) || true,
                    }
                  )}
                />
              </div>
              <FieldError
                error={errors.emergency_contacts?.[index]?.phone_number}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label>Notes</Label>
            <Input
              as="textarea"
              rows={5}
              className="min-h-32 resize-none"
              {...register(`emergency_contacts.${index}.notes`)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-cf-border px-5 py-4">
          <Button
            type="button"
            variant={isPrimary ? "default" : "ghost"}
            onClick={() => setPrimaryEmergencyContactIndex(index)}
          >
            <Star className="h-4 w-4" />
            Primary
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              removeEmergencyContact(index);
              setPrimaryEmergencyContactIndex((current) => {
                if (current === index) return 0;
                if (current > index) return current - 1;
                return current;
              });
              setEditingEmergencyContactIndex((current) => {
                if (current === null) return current;
                if (current === index) return null;
                if (current > index) return current - 1;
                return current;
              });
            }}
            disabled={emergencyContactFields.length === 1}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
          <Button type="button" variant="default" onClick={onClose}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PatientEmergencyContactsSection({
  appendEmergencyContact,
  editingEmergencyContactIndex,
  emergencyContactFields,
  errors,
  primaryEmergencyContactIndex,
  register,
  registerPhoneField,
  removeEmergencyContact,
  setEditingEmergencyContactIndex,
  setPrimaryEmergencyContactIndex,
  watchedEmergencyContacts,
}) {
  const closeEditor = () => setEditingEmergencyContactIndex(null);
  const editedField = emergencyContactFields[editingEmergencyContactIndex];
  const editedContact =
    watchedEmergencyContacts[editingEmergencyContactIndex] || editedField;

  return (
    <>
      <Panel icon={Siren} title="Emergency Contacts" bodyClassName="mt-5">
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {emergencyContactFields.map((field, index) => {
              const contactPreview = watchedEmergencyContacts[index] || field;
              const isEditing = editingEmergencyContactIndex === index;
              const contactName =
                contactPreview?.name?.trim() || `Contact ${index + 1}`;
              const contactRelationship =
                contactPreview?.relationship?.trim() || "Relationship";
              const contactPhone =
                contactPreview?.phone_number?.trim() || "Phone";

              return (
                <div
                  key={field.id}
                  className={[
                    "rounded-2xl border bg-cf-surface shadow-sm transition",
                    isEditing ? "ring-2 ring-cf-border-strong" : "",
                    primaryEmergencyContactIndex === index
                      ? "border-cf-border-strong"
                      : "border-cf-border",
                  ].join(" ")}
                >
                  {!isEditing ? (
                    <>
                      <input
                        type="hidden"
                        {...register(`emergency_contacts.${index}.name`)}
                      />
                      <input
                        type="hidden"
                        {...register(
                          `emergency_contacts.${index}.relationship`
                        )}
                      />
                      <input
                        type="hidden"
                        {...register(
                          `emergency_contacts.${index}.phone_number`
                        )}
                      />
                      <input
                        type="hidden"
                        {...register(`emergency_contacts.${index}.notes`)}
                      />
                    </>
                  ) : null}

                  <button
                    type="button"
                    onDoubleClick={() => setEditingEmergencyContactIndex(index)}
                    className={[
                      "flex w-full items-start gap-3 p-4 text-left transition hover:bg-cf-surface-muted/55",
                      isEditing ? "bg-cf-surface-muted/45" : "",
                    ].join(" ")}
                    aria-label={`Open emergency contact ${index + 1}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface text-cf-text-subtle">
                      <Siren className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-cf-text">
                          {contactName}
                        </div>
                        {primaryEmergencyContactIndex === index ? (
                          <Badge variant="success">Primary</Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-cf-text-muted">
                        <span className="truncate">{contactRelationship}</span>
                        <span className="truncate font-medium text-cf-text">
                          {contactPhone}
                        </span>
                      </div>
                      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                        Double-click to edit
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                const nextIndex = emergencyContactFields.length;
                appendEmergencyContact({
                  ...EMPTY_EMERGENCY_CONTACT,
                  is_primary: emergencyContactFields.length === 0,
                });
                setEditingEmergencyContactIndex(nextIndex);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </div>
        </div>
      </Panel>

      {editingEmergencyContactIndex !== null && editedField ? (
        <EmergencyContactEditor
          contactPreview={editedContact}
          emergencyContactFields={emergencyContactFields}
          errors={errors}
          index={editingEmergencyContactIndex}
          isPrimary={
            primaryEmergencyContactIndex === editingEmergencyContactIndex
          }
          onClose={closeEditor}
          register={register}
          registerPhoneField={registerPhoneField}
          removeEmergencyContact={removeEmergencyContact}
          setEditingEmergencyContactIndex={setEditingEmergencyContactIndex}
          setPrimaryEmergencyContactIndex={setPrimaryEmergencyContactIndex}
        />
      ) : null}
    </>
  );
}
