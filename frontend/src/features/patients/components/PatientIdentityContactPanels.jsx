import { IdCard, Mail } from "lucide-react";

import { FieldError, FieldHint, FormLabel as Label } from "./PatientFormFields";
import { Button, Input, Panel } from "../../../shared/components/ui";
import { validatePhoneNumber, validateSsn } from "../utils/contactValidation";

export function PatientIdentityPanel({
  errors,
  handleToggleSsn,
  maskedSsn,
  patient,
  register,
  registerSsnField,
  shouldEditSsn,
  showFullSsn,
}) {
  return (
    <Panel icon={IdCard} title="Identity" tone="subtle">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>First Name</Label>
          <Input
            type="text"
            {...register("first_name", {
              required: "First name is required.",
            })}
          />
          <FieldError error={errors.first_name} />
        </div>

        <div>
          <Label>Last Name</Label>
          <Input
            type="text"
            {...register("last_name", {
              required: "Last name is required.",
            })}
          />
          <FieldError error={errors.last_name} />
        </div>

        <div>
          <Label>Middle Name</Label>
          <Input type="text" {...register("middle_name")} />
        </div>

        <div>
          <Label>Preferred Name</Label>
          <Input type="text" {...register("preferred_name")} />
        </div>

        <div>
          <Label>Date of Birth</Label>
          <Input
            type="date"
            {...register("date_of_birth", {
              required: "Date of birth is required.",
            })}
          />
          <FieldError error={errors.date_of_birth} />
        </div>

        <div>
          <Label>MRN</Label>
          <Input
            type="text"
            value={patient?.chart_number || ""}
            readOnly
            placeholder="Assigned by system"
            className="bg-cf-surface-muted text-cf-text-subtle"
          />
        </div>

        <div className="md:col-span-2">
          <input type="hidden" {...register("ssn_last4")} />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <Label>Social Security Number</Label>
              {shouldEditSsn ? (
                <Input
                  type={showFullSsn ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="off"
                  {...registerSsnField("ssn", {
                    validate: (value) => validateSsn(value) || true,
                  })}
                />
              ) : (
                <>
                  <input
                    type="hidden"
                    {...registerSsnField("ssn", {
                      validate: (value) => validateSsn(value) || true,
                    })}
                  />
                  <div className="rounded-xl border border-cf-border bg-cf-surface-muted px-3 py-2 text-sm font-semibold tracking-[0.18em] text-cf-text">
                    {maskedSsn}
                  </div>
                </>
              )}
              {errors.ssn ? (
                <FieldError error={errors.ssn} />
              ) : (
                <FieldHint>
                  Full SSN is only fetched when you reveal it.
                </FieldHint>
              )}
            </div>

            <Button type="button" variant="default" onClick={handleToggleSsn}>
              {showFullSsn ? "Hide SSN" : "Show / Edit SSN"}
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function PatientContactPanel({
  errors,
  mode,
  register,
  registerPhoneField,
}) {
  return (
    <Panel icon={Mail} title="Contact">
      <div className="grid gap-4">
        <div>
          <Label>Email</Label>
          <Input type="email" {...register("email")} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Cell Phone</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="(555)555-1234"
              {...registerPhoneField("phone_cell", {
                validate: (value, values) => {
                  const phoneError = validatePhoneNumber(value);
                  if (phoneError) return phoneError;
                  if (
                    value?.trim() ||
                    values.phone_home?.trim() ||
                    values.phone_work?.trim()
                  ) {
                    return true;
                  }
                  return "At least one phone number is required.";
                },
              })}
            />
            {errors.phone_cell ? (
              <FieldError error={errors.phone_cell} />
            ) : (
              <FieldHint>At least one phone is required.</FieldHint>
            )}
          </div>

          <div>
            <Label>Home Phone</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="(555)555-1234"
              {...registerPhoneField("phone_home", {
                validate: (value) => validatePhoneNumber(value) || true,
              })}
            />
            <FieldError error={errors.phone_home} />
          </div>

          <div>
            <Label>Work Phone</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="(555)555-1234"
              {...registerPhoneField("phone_work", {
                validate: (value) => validatePhoneNumber(value) || true,
              })}
            />
            <FieldError error={errors.phone_work} />
          </div>
        </div>

        {mode === "edit" ? (
          <label className="inline-flex items-center gap-2 text-sm text-cf-text-muted">
            <input
              type="checkbox"
              {...register("is_active")}
              className="h-4 w-4 rounded border-cf-border"
            />
            Active patient
          </label>
        ) : null}
      </div>
    </Panel>
  );
}
