import { useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, HeartPulse, IdCard, Mail, Stethoscope } from "lucide-react";

import { patchPatient } from "../../api/patients";
import { Badge } from "../../../../shared/components/ui";
import { formatDOB } from "../../../../shared/utils/dateTime";
import { getErrorMessage } from "../../../../shared/utils/errors";
import {
  ETHNICITY_OPTIONS,
  RACE_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
} from "../patientModalData";
import {
  ETHNICITY_LABELS,
  RACE_LABELS,
  formatDeclinableValue,
} from "../PatientHubSections";
import IntakeBanner from "./IntakeBanner";
import InlineEditField from "./InlineEditField";
import EmergencyContactsSection from "./EmergencyContactsSection";
import PharmacySection from "./PharmacySection";
import PhonesSection from "./PhonesSection";
import SsnSection from "./SsnSection";
import { RegistrationSectionShell } from "./RegistrationSectionShell";

function buildGenderOptions(genderOptions) {
  return [
    { value: "", label: "Select…" },
    ...(genderOptions || []).map((option) => ({
      value: String(option.id),
      label: option.name,
    })),
  ];
}

function buildProviderOptions(careProviders, emptyLabel) {
  return [
    { value: "", label: emptyLabel },
    ...(careProviders || []).map((provider) => ({
      value: String(provider.id),
      label:
        provider.display_name ||
        [provider.first_name, provider.last_name].filter(Boolean).join(" "),
    })),
  ];
}

function buildAddressPatch(currentAddress, key, nextValue) {
  const base = {
    line_1: "",
    line_2: "",
    city: "",
    state: "NY",
    zip_code: "",
    ...(currentAddress || {}),
  };
  return { ...base, [key]: nextValue };
}

const DECLINED_VALUE = "__declined__";

function buildDeclinableSelectOptions(options) {
  return [
    ...options.map((option) => ({
      value: option.value,
      label: option.label,
    })),
    { value: DECLINED_VALUE, label: "Declined" },
  ];
}

function getDeclinableSelectValue(value, declined) {
  if (declined) return DECLINED_VALUE;
  return value || "";
}

function buildDeclinablePatch(field, declinedField, nextValue) {
  if (nextValue === DECLINED_VALUE) {
    return { [field]: "", [declinedField]: true };
  }

  return { [field]: nextValue, [declinedField]: false };
}

export default function HubRegistrationInline({
  patient,
  facilityId,
  genderOptions,
  careProviders,
  pharmacies = [],
  insurancePolicies,
  emergencyContacts,
  onSwitchToInsurance,
}) {
  const queryClient = useQueryClient();
  const sectionRefs = useRef({});

  const patchMutation = useMutation({
    mutationFn: (partial) => patchPatient(patient.id, partial, facilityId),
    onSuccess: (savedPatient) => {
      queryClient.setQueryData(
        ["patientHub", "patient", facilityId || null, String(patient.id)],
        savedPatient
      );
    },
  });

  const savePartial = async (partial) => {
    try {
      await patchMutation.mutateAsync(partial);
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to save."));
    }
  };

  const saveEmergencyContacts = (nextContacts) =>
    savePartial({ emergency_contacts: nextContacts });

  const savePhones = (nextPhones) => savePartial({ phones: nextPhones });

  const genderSelectOptions = useMemo(
    () => buildGenderOptions(genderOptions),
    [genderOptions]
  );
  const pcpOptions = useMemo(
    () => buildProviderOptions(careProviders, "No PCP selected"),
    [careProviders]
  );
  const referringOptions = useMemo(
    () => buildProviderOptions(careProviders, "No referring provider"),
    [careProviders]
  );

  // USCDI demographics live inside the Identity section, so banner keys for
  // those fields scroll to the same section ref.
  const SECTION_KEY_ALIASES = {
    sexAtBirth: "identity",
    race: "identity",
    ethnicity: "identity",
    language: "identity",
  };

  const handleJumpTo = (sectionKey) => {
    if (sectionKey === "insurance") {
      onSwitchToInsurance?.();
      return true;
    }
    const targetKey = SECTION_KEY_ALIASES[sectionKey] || sectionKey;
    const node = sectionRefs.current[targetKey];
    if (!node) return false;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  };

  const dobDisplay = patient.date_of_birth
    ? formatDOB(patient.date_of_birth)
    : "";
  const raceDisplay = formatDeclinableValue(
    patient.race,
    patient.race_declined,
    RACE_LABELS
  );
  const ethnicityDisplay = formatDeclinableValue(
    patient.ethnicity,
    patient.ethnicity_declined,
    ETHNICITY_LABELS
  );
  const languageDisplay = formatDeclinableValue(
    patient.preferred_language,
    patient.preferred_language_declined
  );

  return (
    <div className="space-y-4">
      <IntakeBanner
        patient={patient}
        insurancePolicies={insurancePolicies}
        emergencyContacts={emergencyContacts}
        onJumpTo={handleJumpTo}
      />

      {/* Identity is the largest section — give it the full row and a 3-col
          internal field grid so it doesn't tower over everything else. */}
      <div
        ref={(node) => {
          sectionRefs.current.identity = node;
        }}
      >
        <RegistrationSectionShell
          icon={IdCard}
          title="Identity & demographics"
          badge={
            <Badge variant="muted">
              MRN {patient.chart_number || "pending"}
            </Badge>
          }
        >
          <dl className="grid grid-cols-1 gap-x-5 gap-y-2 md:grid-cols-2 lg:grid-cols-3">
            <InlineEditField
              label="First name"
              value={patient.first_name || ""}
              onSave={(next) => savePartial({ first_name: next.trim() })}
              validate={(v) => (v.trim() ? null : "First name is required.")}
            />
            <InlineEditField
              label="Last name"
              value={patient.last_name || ""}
              onSave={(next) => savePartial({ last_name: next.trim() })}
              validate={(v) => (v.trim() ? null : "Last name is required.")}
            />
            <InlineEditField
              label="Middle name"
              value={patient.middle_name || ""}
              onSave={(next) => savePartial({ middle_name: next.trim() })}
            />
            <InlineEditField
              label="Preferred name"
              value={patient.preferred_name || ""}
              onSave={(next) => savePartial({ preferred_name: next.trim() })}
            />
            <InlineEditField
              label="Date of birth"
              type="date"
              value={patient.date_of_birth || ""}
              displayValue={dobDisplay}
              onSave={(next) => savePartial({ date_of_birth: next })}
              validate={(v) => (v ? null : "Date of birth is required.")}
            />
            <InlineEditField
              label="Gender"
              type="select"
              options={genderSelectOptions}
              value={patient.gender ? String(patient.gender) : ""}
              displayValue={patient.gender_name || ""}
              onSave={(next) =>
                savePartial({ gender: next ? Number(next) : null })
              }
              validate={(v) => (v ? null : "Gender is required.")}
            />
            <InlineEditField
              label="Sex at birth"
              type="select"
              options={SEX_AT_BIRTH_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={patient.sex_at_birth || ""}
              onSave={(next) => savePartial({ sex_at_birth: next })}
            />
            <InlineEditField
              label="Pronouns"
              value={patient.pronouns || ""}
              onSave={(next) => savePartial({ pronouns: next.trim() })}
            />
            <InlineEditField
              label="Race"
              type="select"
              options={buildDeclinableSelectOptions(RACE_OPTIONS)}
              value={getDeclinableSelectValue(
                patient.race,
                patient.race_declined
              )}
              displayValue={raceDisplay}
              onSave={(next) =>
                savePartial(buildDeclinablePatch("race", "race_declined", next))
              }
            />
            <InlineEditField
              label="Ethnicity"
              type="select"
              options={buildDeclinableSelectOptions(ETHNICITY_OPTIONS)}
              value={getDeclinableSelectValue(
                patient.ethnicity,
                patient.ethnicity_declined
              )}
              displayValue={ethnicityDisplay}
              onSave={(next) =>
                savePartial(
                  buildDeclinablePatch("ethnicity", "ethnicity_declined", next)
                )
              }
            />
            <InlineEditField
              label="Preferred language"
              value={patient.preferred_language || ""}
              displayValue={languageDisplay}
              onSave={(next) =>
                savePartial({
                  preferred_language: next.trim(),
                  preferred_language_declined: false,
                })
              }
            />
            <SsnSection
              patient={patient}
              facilityId={facilityId}
              onSavePartial={savePartial}
            />
          </dl>
        </RegistrationSectionShell>
      </div>

      {/* Contact + Address paired — both medium-height, similar visual weight. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div
          ref={(node) => {
            sectionRefs.current.contact = node;
          }}
        >
          <RegistrationSectionShell icon={Mail} title="Contact">
            <div className="space-y-3">
              <InlineEditField
                label="Email"
                type="email"
                value={patient.email || ""}
                onSave={(next) => savePartial({ email: next.trim() })}
                validate={(v) =>
                  !v.trim() || /\S+@\S+\.\S+/.test(v.trim())
                    ? null
                    : "Enter a valid email."
                }
              />
              <PhonesSection
                phones={patient.phones || []}
                onSavePhones={savePhones}
              />
            </div>
          </RegistrationSectionShell>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.address = node;
          }}
        >
          <RegistrationSectionShell icon={Building2} title="Address">
            <dl className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
              <InlineEditField
                label="Street address"
                className="md:col-span-2"
                value={patient.address?.line_1 || ""}
                onSave={(next) =>
                  savePartial({
                    address: buildAddressPatch(
                      patient.address,
                      "line_1",
                      next.trim()
                    ),
                  })
                }
              />
              <InlineEditField
                label="Apartment, suite, unit"
                value={patient.address?.line_2 || ""}
                onSave={(next) =>
                  savePartial({
                    address: buildAddressPatch(
                      patient.address,
                      "line_2",
                      next.trim()
                    ),
                  })
                }
              />
              <InlineEditField
                label="City"
                value={patient.address?.city || ""}
                onSave={(next) =>
                  savePartial({
                    address: buildAddressPatch(
                      patient.address,
                      "city",
                      next.trim()
                    ),
                  })
                }
              />
              <InlineEditField
                label="State"
                value={patient.address?.state || ""}
                onSave={(next) =>
                  savePartial({
                    address: buildAddressPatch(
                      patient.address,
                      "state",
                      next.trim().toUpperCase()
                    ),
                  })
                }
              />
              <InlineEditField
                label="ZIP code"
                inputMode="numeric"
                value={patient.address?.zip_code || ""}
                onSave={(next) =>
                  savePartial({
                    address: buildAddressPatch(
                      patient.address,
                      "zip_code",
                      next.trim()
                    ),
                  })
                }
              />
            </dl>
          </RegistrationSectionShell>
        </div>
      </div>

      {/* Emergency contacts gets its own full-width row above the smaller
          paired sections so destructive/missing items are surfaced first. */}
      <div
        ref={(node) => {
          sectionRefs.current.emergency = node;
        }}
      >
        <EmergencyContactsSection
          contacts={emergencyContacts}
          saving={patchMutation.isPending}
          onSaveContacts={saveEmergencyContacts}
        />
      </div>

      {/* Providers + Pharmacy paired — both small, both lookup-driven. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div
          ref={(node) => {
            sectionRefs.current.pcp = node;
          }}
        >
          <RegistrationSectionShell icon={Stethoscope} title="Providers">
            <dl className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
              <InlineEditField
                label="PCP"
                type="select"
                options={pcpOptions}
                value={patient.pcp ? String(patient.pcp) : ""}
                displayValue={patient.pcp_name || ""}
                onSave={(next) =>
                  savePartial({ pcp: next ? Number(next) : null })
                }
              />
              <InlineEditField
                label="Referring provider"
                type="select"
                options={referringOptions}
                value={
                  patient.referring_provider
                    ? String(patient.referring_provider)
                    : ""
                }
                displayValue={patient.referring_provider_name || ""}
                onSave={(next) =>
                  savePartial({
                    referring_provider: next ? Number(next) : null,
                  })
                }
              />
            </dl>
          </RegistrationSectionShell>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.pharmacy = node;
          }}
        >
          <PharmacySection
            patient={patient}
            pharmacies={pharmacies}
            onSavePartial={savePartial}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cf-border bg-cf-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] text-cf-text-muted">
          <HeartPulse className="h-3 w-3 text-cf-text-subtle" />
          <span>
            Inline edits save instantly. The Activity Log captures every change.
          </span>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
          <span
            className={[
              "text-[10px] font-semibold uppercase tracking-[0.14em]",
              patient.is_active === false
                ? "text-cf-warning-text"
                : "text-cf-text-subtle",
            ].join(" ")}
          >
            {patient.is_active === false ? "Inactive" : "Active patient"}
          </span>
          <span
            className="relative inline-flex h-5 w-9 items-center rounded-full bg-cf-surface-soft ring-1 ring-cf-border transition data-[active=true]:bg-cf-text"
            data-active={patient.is_active !== false}
          >
            <span
              className="absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all"
              style={{
                left: patient.is_active === false ? "0.125rem" : "auto",
                right: patient.is_active === false ? "auto" : "0.125rem",
              }}
            />
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={patient.is_active !== false}
            onChange={(event) =>
              savePartial({ is_active: event.target.checked })
            }
          />
        </label>
      </div>
    </div>
  );
}
