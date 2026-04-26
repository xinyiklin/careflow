import PatientSearchField from "../../patients/components/PatientSearchField";
import { formatDOB } from "../../../shared/utils/dateTime";
import {
  PatientMetaItem,
  ReadOnlyValueField,
  SummaryItem,
} from "./AppointmentModalFields";

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
  patientPhone,
  patientAddress,
  insurancePoliciesQuery,
  primaryInsurancePolicy,
}) {
  return (
    <aside className="min-h-0 overflow-y-auto border-b border-cf-border bg-gradient-to-b from-cf-surface-soft/60 to-cf-surface px-6 py-6 lg:order-2 lg:border-b-0 lg:border-l">
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

      <div className="mt-3 space-y-5">
        <section className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-cf-text">
              {patientDisplayName || "No patient selected"}
            </div>
            <span className="font-mono text-[11px] tracking-tight text-cf-text-subtle">
              {patientSnapshot.chart_number || "MRN pending"}
            </span>
          </div>
          <div className="mt-1 text-xs text-cf-text-muted">
            {patientSnapshot.gender ? `${patientSnapshot.gender} · ` : ""}
            {patientSnapshot.date_of_birth
              ? `DOB ${formatDOB(patientSnapshot.date_of_birth)}`
              : "DOB pending"}
          </div>

          <div className="mt-4">
            {mode === "edit" ? (
              <ReadOnlyValueField value={patientDisplayName} />
            ) : (
              <PatientSearchField
                facilityId={facilityId}
                selectedPatient={selectedPatient}
                onSelectPatient={onSelectPatient}
                onOpenDetailedSearch={onOpenDetailedSearch}
                onOpenCreatePatient={onOpenCreatePatient}
                recentPatients={recentPatients}
              />
            )}

            {selectedPatient || patientDetailsQuery.isLoading ? (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <PatientMetaItem
                    label="DOB"
                    value={
                      patientDetailsQuery.isLoading
                        ? "Loading..."
                        : patientSnapshot.date_of_birth
                          ? formatDOB(patientSnapshot.date_of_birth)
                          : ""
                    }
                  />
                  <PatientMetaItem
                    label="MRN"
                    value={
                      patientDetailsQuery.isLoading
                        ? "Loading..."
                        : patientSnapshot.chart_number
                    }
                  />
                </div>
                <PatientMetaItem
                  className="mt-2"
                  label="Phone"
                  value={
                    patientDetailsQuery.isLoading ? "Loading..." : patientPhone
                  }
                />
                <PatientMetaItem
                  className="mt-2"
                  label="Address"
                  multiline
                  value={
                    patientDetailsQuery.isLoading
                      ? "Loading..."
                      : patientAddress
                  }
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
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
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
