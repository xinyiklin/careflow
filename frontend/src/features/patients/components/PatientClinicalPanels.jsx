import { HeartPulse, MapPin, Stethoscope } from "lucide-react";

import { FieldError, FormLabel as Label } from "./PatientFormFields";
import {
  ETHNICITY_OPTIONS,
  RACE_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  getProviderLabel,
} from "./patientModalData";
import { Input, Panel } from "../../../shared/components/ui";

export function PatientAddressPanel({ register }) {
  return (
    <Panel icon={MapPin} title="Patient Address">
      <div className="grid gap-4">
        <div>
          <Label>Street Address</Label>
          <Input type="text" {...register("address_line_1")} />
        </div>

        <div>
          <Label>Apartment, Suite, Unit</Label>
          <Input type="text" {...register("address_line_2")} />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_140px_180px]">
          <div>
            <Label>City</Label>
            <Input type="text" {...register("address_city")} />
          </div>

          <div>
            <Label>State</Label>
            <Input as="select" {...register("address_state")}>
              <option value="NY">NY</option>
              <option value="CA">CA</option>
              <option value="TX">TX</option>
              <option value="FL">FL</option>
            </Input>
          </div>

          <div>
            <Label>ZIP Code</Label>
            <Input
              type="text"
              inputMode="numeric"
              {...register("address_zip_code")}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function PatientClinicalProfilePanel({
  errors,
  ethnicityDeclined,
  genderOptions,
  preferredLanguageDeclined,
  raceDeclined,
  register,
}) {
  return (
    <Panel icon={HeartPulse} title="Clinical Profile">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <Label>Gender</Label>
          <Input
            as="select"
            {...register("gender", {
              required: "Gender is required.",
            })}
          >
            <option value="">Select gender</option>
            {genderOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Input>
          <FieldError error={errors.gender} />
        </div>

        <div>
          <Label>Sex at Birth</Label>
          <Input as="select" {...register("sex_at_birth")}>
            {SEX_AT_BIRTH_OPTIONS.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Input>
        </div>

        <div>
          <Label>Race</Label>
          <Input as="select" disabled={raceDeclined} {...register("race")}>
            {RACE_OPTIONS.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Input>
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-cf-text-muted">
            <input
              type="checkbox"
              {...register("race_declined")}
              className="h-3.5 w-3.5 rounded border-cf-border"
            />
            Declined
          </label>
        </div>

        <div>
          <Label>Ethnicity</Label>
          <Input
            as="select"
            disabled={ethnicityDeclined}
            {...register("ethnicity")}
          >
            {ETHNICITY_OPTIONS.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Input>
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-cf-text-muted">
            <input
              type="checkbox"
              {...register("ethnicity_declined")}
              className="h-3.5 w-3.5 rounded border-cf-border"
            />
            Declined
          </label>
        </div>

        <div>
          <Label>Preferred Language</Label>
          <Input
            type="text"
            disabled={preferredLanguageDeclined}
            {...register("preferred_language")}
          />
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-cf-text-muted">
            <input
              type="checkbox"
              {...register("preferred_language_declined")}
              className="h-3.5 w-3.5 rounded border-cf-border"
            />
            Declined
          </label>
        </div>

        <div>
          <Label>Pronouns</Label>
          <Input type="text" {...register("pronouns")} />
        </div>
      </div>
    </Panel>
  );
}

export function PatientCareTeamPanel({ careProviders, register }) {
  return (
    <Panel icon={Stethoscope} title="Care Team" tone="subtle">
      <div className="grid gap-4">
        <input type="hidden" {...register("preferred_pharmacy")} />
        <div>
          <Label>PCP</Label>
          <Input as="select" {...register("pcp")}>
            <option value="">No PCP selected</option>
            {careProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {getProviderLabel(provider)}
              </option>
            ))}
          </Input>
        </div>

        <div>
          <Label>Referring Provider</Label>
          <Input as="select" {...register("referring_provider")}>
            <option value="">No referring provider</option>
            {careProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {getProviderLabel(provider)}
              </option>
            ))}
          </Input>
        </div>
      </div>
    </Panel>
  );
}
