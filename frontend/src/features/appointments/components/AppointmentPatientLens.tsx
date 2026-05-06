import PatientSearchField from "../../patients/components/PatientSearchField";
import { formatDOB } from "../../../shared/utils/dateTime";
import { PatientMetaItem, SummaryItem } from "./AppointmentModalFields";
import type { ComponentType } from "react";
import type { FieldErrors } from "react-hook-form";
import type { UseQueryResult } from "@tanstack/react-query";
import type { EntityId } from "../../../shared/api/types";
import type { NormalizedPhoneEntry } from "../../patients/utils/contactValidation";
import type {
  AppointmentFormValues,
  AppointmentMode,
  AppointmentPatient,
  PatientInsurancePolicy,
} from "../types";

type PatientSearchFieldProps = {
  facilityId?: EntityId | null;
  selectedPatient?: AppointmentPatient | null;
  onSelectPatient?: (patient: AppointmentPatient | null) => void;
  onOpenDetailedSearch?: () => void;
  onOpenCreatePatient?: () => void;
  recentPatients?: AppointmentPatient[];
};

type AppointmentPatientLensProps = {
  selectedPatient?: AppointmentPatient | null;
  onOpenPatientHub?: (patient: AppointmentPatient) => void;
  patientDisplayName: string;
  patientSnapshot: AppointmentPatient;
  mode: AppointmentMode;
  facilityId?: EntityId | null;
  onSelectPatient?: (patient: AppointmentPatient | null) => void;
  onOpenDetailedSearch?: () => void;
  onOpenCreatePatient?: () => void;
  recentPatients: AppointmentPatient[];
  patientDetailsQuery: UseQueryResult<AppointmentPatient>;
  errors: FieldErrors<AppointmentFormValues>;
  patientPhones: NormalizedPhoneEntry[];
  patientAddress: string;
  insurancePoliciesQuery: UseQueryResult<PatientInsurancePolicy[]>;
  primaryInsurancePolicy?: PatientInsurancePolicy | null;
};

const TypedPatientSearchField =
  PatientSearchField as ComponentType<PatientSearchFieldProps>;

export default function AppointmentPatientLens({
  selectedPatient,
  onOpenPatientHub,
  patientDisplayName,
  patientSnapshot,
  mode,
  facilityId,
  onSelectPatient,
  onOpenDetailedSearch,
  onOpenCreatePatient,
  recentPatients,
  patientDetailsQuery,
  errors,
  patientPhones,
  patientAddress,
  insurancePoliciesQuery,
  primaryInsurancePolicy,
}: AppointmentPatientLensProps) {
  const isPatientLoading = patientDetailsQuery.isLoading;
  const dobValue = patientSnapshot.date_of_birth
    ? formatDOB(patientSnapshot.date_of_birth)
    : "";
  const mrnValue = patientSnapshot.chart_number || "";
  const hasPatientIdentity = Boolean(selectedPatient || dobValue || mrnValue);
  const patientMeta = hasPatientIdentity
    ? [
        dobValue ? `DOB ${dobValue}` : "DOB pending",
        mrnValue ? `MRN ${mrnValue}` : "MRN pending",
      ].join(" · ")
    : "Select a patient to view demographics";

  return (
    <aside className="min-h-0 overflow-y-auto border-b border-cf-border bg-cf-page-bg px-4 py-4 lg:order-2 lg:border-b-0 lg:border-l">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
          Patient lens
        </div>
        {selectedPatient ? (
          <button
            type="button"
            onClick={() => onOpenPatientHub?.(selectedPatient)}
            className="text-xs font-semibold text-cf-text hover:underline"
          >
            Open hub →
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-4">
        <section>
          <div className="text-sm font-semibold text-cf-text">
            {patientDisplayName || "No patient selected"}
          </div>
          <div className="mt-1 text-xs font-medium text-cf-text-muted">
            {isPatientLoading ? "Loading patient..." : patientMeta}
          </div>

          <div className="mt-3">
            {mode !== "edit" ? (
              <TypedPatientSearchField
                facilityId={facilityId}
                selectedPatient={selectedPatient}
                onSelectPatient={onSelectPatient}
                onOpenDetailedSearch={onOpenDetailedSearch}
                onOpenCreatePatient={onOpenCreatePatient}
                recentPatients={recentPatients}
              />
            ) : null}

            {selectedPatient || isPatientLoading ? (
              <div className="mt-3">
                {isPatientLoading ? (
                  <PatientMetaItem label="Phone" value="Loading..." />
                ) : patientPhones.length ? (
                  patientPhones.map((phone) => (
                    <PatientMetaItem
                      key={`${phone.label}-${phone.number}`}
                      label={`${phone.labelTitle} phone`}
                      value={phone.formattedNumber}
                    />
                  ))
                ) : (
                  <PatientMetaItem label="Phone" value="" />
                )}
                <PatientMetaItem
                  label="Address"
                  multiline
                  value={isPatientLoading ? "Loading..." : patientAddress}
                />
              </div>
            ) : null}

            {errors.patient ? (
              <p className="mt-2 text-sm text-cf-danger-text">
                {errors.patient.message}
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            <span>Primary insurance</span>
            {primaryInsurancePolicy ? (
              <span className="rounded-full bg-cf-accent-soft px-2 py-0.5 text-[10px] font-semibold text-cf-text ring-1 ring-cf-border">
                Active
              </span>
            ) : null}
          </div>
          <div className="mt-2 space-y-2">
            <SummaryItem
              label="Carrier"
              value={
                insurancePoliciesQuery.isLoading
                  ? "Loading..."
                  : primaryInsurancePolicy?.carrier_name
              }
            />
            <SummaryItem
              label="Plan"
              value={primaryInsurancePolicy?.plan_name}
            />
            <SummaryItem
              label="Member ID"
              value={primaryInsurancePolicy?.member_id}
            />
            <SummaryItem
              label="Group"
              value={primaryInsurancePolicy?.group_number}
            />
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            Providers
          </div>
          <div className="mt-2 space-y-2">
            <SummaryItem
              label="PCP"
              value={
                patientDetailsQuery.isLoading
                  ? "Loading..."
                  : patientSnapshot.pcp_name
              }
            />
            <SummaryItem
              label="Referring"
              value={
                patientDetailsQuery.isLoading
                  ? "Loading..."
                  : patientSnapshot.referring_provider_name
              }
            />
          </div>
        </section>
      </div>
    </aside>
  );
}
