import type { ReactNode } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { formatDateOnly } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useProfile } from "../api/profile";

type Row = { label: string; value: ReactNode };

function dash(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const trimmed = String(value).trim();
  return trimmed === "" ? "—" : trimmed;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="border-t border-cf-border pt-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
        {title}
      </h2>
      <dl className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 text-sm"
          >
            <dt className="text-xs text-cf-text-muted">{row.label}</dt>
            <dd className="text-cf-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProfilePage() {
  const { patient: bootstrapPatient } = useAuth();
  const { data, isError, error } = useProfile();
  const patient = data ?? bootstrapPatient;

  if (!patient) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Profile" />
        {isError ? (
          <p className="text-sm text-cf-text-muted">{getErrorMessage(error)}</p>
        ) : null}
      </div>
    );
  }

  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");
  const address = patient.address;
  const addressLines = [
    dash(address?.line_1),
    address?.line_2 ? dash(address.line_2) : null,
    [dash(address?.city), dash(address?.state), dash(address?.zip_code)].join(
      ", "
    ),
  ].filter((line): line is string => Boolean(line));

  const emergency = patient.primary_emergency_contact;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Profile" />
      {isError ? (
        <p className="mb-4 text-sm text-cf-text-muted">
          {getErrorMessage(error)}
        </p>
      ) : null}

      <div className="space-y-5">
        <Section
          title="Identity"
          rows={[
            { label: "Name", value: dash(fullName) },
            {
              label: "Date of birth",
              value: formatDateOnly(patient.date_of_birth),
            },
            { label: "Sex at birth", value: dash(patient.sex_at_birth) },
            { label: "Pronouns", value: dash(patient.pronouns) },
            { label: "Race", value: dash(patient.race) },
            { label: "Ethnicity", value: dash(patient.ethnicity) },
            { label: "Language", value: dash(patient.preferred_language) },
          ]}
        />
        <Section
          title="Contact"
          rows={[
            { label: "Email", value: dash(patient.email) },
            { label: "Phone", value: dash(patient.primary_phone_number) },
          ]}
        />
        <Section
          title="Address"
          rows={[
            {
              label: "Primary",
              value: (
                <div className="space-y-0.5">
                  {addressLines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              ),
            },
          ]}
        />
        <Section
          title="Emergency contact"
          rows={[
            { label: "Name", value: dash(emergency?.name) },
            { label: "Relationship", value: dash(emergency?.relationship) },
            { label: "Phone", value: dash(emergency?.phone_number) },
          ]}
        />
        <Section
          title="Care"
          rows={[
            { label: "Facility", value: dash(patient.facility_name) },
            { label: "Time zone", value: dash(patient.facility_timezone) },
            {
              label: "Pharmacy",
              value: dash(patient.preferred_pharmacy_name),
            },
          ]}
        />
      </div>
    </div>
  );
}
