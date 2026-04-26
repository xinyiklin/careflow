import {
  CalendarClock,
  CalendarDays,
  CircleUserRound,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  HeartPulse,
  IdCard,
  Languages,
  Mail,
  MapPin,
  Phone,
  Pill,
  Plus,
  ShieldCheck,
  Siren,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";

import { Badge, Button, Panel } from "../../../shared/components/ui";
import { formatDOB } from "../../../shared/utils/dateTime";
import {
  AppointmentCard,
  DetailRow,
  EmptyState,
  ETHNICITY_LABELS,
  formatAddress,
  formatDateTime,
  formatDeclinableValue,
  formatFullSsn,
  formatMaskedSsn,
  InsurancePolicyCard,
  PharmacyPreferenceCard,
  RACE_LABELS,
  SectionHeader,
  SummaryTile,
} from "./PatientHubSections";

export function PatientPharmaciesPanel({
  activePatientPharmacies,
  defaultPharmacyName,
  erxPharmacyCount,
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[0.78fr_1.22fr]">
      <div className="grid min-h-0 gap-4">
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-5">
          <SectionHeader
            title="Pharmacy Summary"
            description="Prescription routing and pharmacy options saved for this patient."
          />
          <div className="mt-4 grid gap-3">
            <SummaryTile
              icon={Pill}
              label="Default Pharmacy"
              value={defaultPharmacyName}
            />
            <SummaryTile
              icon={ClipboardList}
              label="Saved Pharmacies"
              value={String(activePatientPharmacies.length)}
            />
            <SummaryTile
              icon={FileText}
              label="eRx Ready"
              value={String(erxPharmacyCount)}
            />
          </div>
        </div>
      </div>

      <Panel
        icon={Pill}
        title="Patient Pharmacies"
        description="Default and alternate pharmacies available when sending prescriptions."
        className="flex h-full min-h-0 flex-col"
        bodyClassName="min-h-0 flex-1 overflow-auto"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {activePatientPharmacies.length} saved
          </Badge>
          <Badge variant="muted">{erxPharmacyCount} eRx ready</Badge>
        </div>

        {activePatientPharmacies.length === 0 ? (
          <EmptyState
            title="No patient pharmacies"
            body="Choose a default pharmacy in demographics to start the patient pharmacy list."
          />
        ) : (
          <div className="space-y-3">
            {activePatientPharmacies.map((preference) => (
              <PharmacyPreferenceCard
                key={preference.id}
                preference={preference}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export function PatientInsurancePanel({
  insurancePoliciesQuery,
  insurancePolicies,
  activeInsuranceCount,
  primaryInsurancePolicy,
  onOpenPolicy,
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[0.78fr_1.22fr]">
      <div className="grid min-h-0 gap-4">
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-5">
          <SectionHeader
            title="Coverage Summary"
            description="A quick view of the patient’s active payer setup."
          />
          <div className="mt-4 grid gap-3">
            <SummaryTile
              icon={ShieldCheck}
              label="Primary Carrier"
              value={primaryInsurancePolicy?.carrier_name}
            />
            <SummaryTile
              icon={CreditCard}
              label="Member ID"
              value={primaryInsurancePolicy?.member_id}
            />
            <SummaryTile
              icon={FileText}
              label="Plan"
              value={primaryInsurancePolicy?.plan_name}
            />
            <SummaryTile
              icon={ShieldCheck}
              label="Active Policies"
              value={`${activeInsuranceCount} of ${insurancePolicies.length}`}
            />
          </div>
        </div>
      </div>

      <Panel
        icon={ShieldCheck}
        title="Insurance Policies"
        description="Open a policy to update member details, dates, or status."
        className="flex h-full min-h-0 flex-col"
        bodyClassName="min-h-0 flex-1 overflow-auto"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {insurancePolicies.length} polic
              {insurancePolicies.length === 1 ? "y" : "ies"}
            </Badge>
            <Badge variant="muted">{activeInsuranceCount} active</Badge>
          </div>
          <Button variant="primary" onClick={() => onOpenPolicy()}>
            <Plus className="h-4 w-4" />
            Add Insurance
          </Button>
        </div>

        {insurancePoliciesQuery.isLoading ? (
          <div className="text-sm text-cf-text-muted">
            Loading insurance policies...
          </div>
        ) : insurancePolicies.length === 0 ? (
          <EmptyState
            title="No insurance policies"
            body="Add the patient’s primary coverage to complete the chart."
          />
        ) : (
          <div className="space-y-3">
            {insurancePolicies.map((policy) => (
              <InsurancePolicyCard
                key={policy.id}
                policy={policy}
                onClick={() => onOpenPolicy(policy)}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export function PatientAppointmentsPanel({ appointmentGroups }) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="grid min-h-0 gap-4">
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-5">
          <SectionHeader
            title="Appointment Summary"
            description="A quick read on the patient’s visit cadence."
          />
          <div className="mt-4 grid gap-3">
            <SummaryTile
              icon={CalendarDays}
              label="Upcoming"
              value={String(appointmentGroups.upcoming.length)}
            />
            <SummaryTile
              icon={Clock}
              label="Recent"
              value={String(appointmentGroups.recent.length)}
            />
            <SummaryTile
              icon={CalendarClock}
              label="Next Visit"
              value={formatDateTime(
                appointmentGroups.upcoming[0]?.appointment_time
              )}
            />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 lg:grid-cols-2">
        <Panel
          icon={CalendarClock}
          title="Upcoming Visits"
          className="flex h-full min-h-0 flex-col"
          bodyClassName="min-h-0 flex-1 overflow-auto"
        >
          {appointmentGroups.upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming appointments"
              body="Future visits will appear here."
            />
          ) : (
            <div className="space-y-3">
              {appointmentGroups.upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          icon={CalendarClock}
          title="Past Encounters"
          tone="subtle"
          className="flex h-full min-h-0 flex-col"
          bodyClassName="min-h-0 flex-1 overflow-auto"
        >
          {appointmentGroups.recent.length === 0 ? (
            <EmptyState
              title="No recent appointments"
              body="Past visits will appear here."
            />
          ) : (
            <div className="space-y-3">
              {appointmentGroups.recent.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function PatientDemographicsPanel({
  patient,
  emergencyContacts,
  showFullSsn,
  onToggleSsn,
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 overflow-auto xl:grid-cols-[0.74fr_1.26fr]">
      <div className="grid min-h-0 content-start gap-4">
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface-muted text-lg font-semibold tracking-[0.12em] text-cf-text">
              {[patient.first_name, patient.last_name]
                .map((part) => (part || "").charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase() || "PT"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-cf-text">
                {[patient.first_name, patient.middle_name, patient.last_name]
                  .filter(Boolean)
                  .join(" ")}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="outline">
                  MRN {patient.chart_number || "—"}
                </Badge>
                <Badge
                  variant={patient.is_active === false ? "warning" : "success"}
                >
                  {patient.is_active === false ? "Inactive" : "Active"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <SummaryTile
              icon={CalendarDays}
              label="Date of Birth"
              value={
                patient.date_of_birth ? formatDOB(patient.date_of_birth) : "—"
              }
            />
            <SummaryTile
              icon={Phone}
              label="Primary Phone"
              value={patient.primary_phone_number}
            />
            <SummaryTile icon={Mail} label="Email" value={patient.email} />
          </div>
        </div>

        <Panel
          icon={ClipboardList}
          title="Clinical Contacts"
          tone="subtle"
          className="flex min-h-0 flex-col"
        >
          <div className="grid gap-3">
            <DetailRow
              icon={Stethoscope}
              label="PCP"
              value={patient.pcp_name}
            />
            <DetailRow
              icon={UserRoundCheck}
              label="Referring Provider"
              value={patient.referring_provider_name}
            />
          </div>
        </Panel>
      </div>

      <Panel
        icon={CircleUserRound}
        title="Demographic Profile"
        className="flex min-h-0 flex-col"
      >
        <div className="space-y-5">
          <div>
            <SectionHeader title="Registration Details" />
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailRow
                icon={IdCard}
                label="Legal Name"
                value={[
                  patient.first_name,
                  patient.middle_name,
                  patient.last_name,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
              <DetailRow
                icon={UserRoundCheck}
                label="Preferred Name"
                value={patient.preferred_name}
              />
              <DetailRow
                icon={CalendarDays}
                label="Date of Birth"
                value={
                  patient.date_of_birth ? formatDOB(patient.date_of_birth) : ""
                }
              />
              <DetailRow
                icon={HeartPulse}
                label="Gender"
                value={patient.gender_name}
              />
              <DetailRow
                icon={HeartPulse}
                label="Sex at Birth"
                value={patient.sex_at_birth}
              />
              <DetailRow
                icon={CircleUserRound}
                label="Race"
                value={formatDeclinableValue(
                  patient.race,
                  patient.race_declined,
                  RACE_LABELS
                )}
              />
              <DetailRow
                icon={CircleUserRound}
                label="Ethnicity"
                value={formatDeclinableValue(
                  patient.ethnicity,
                  patient.ethnicity_declined,
                  ETHNICITY_LABELS
                )}
              />
              <DetailRow
                icon={Languages}
                label="Preferred Language"
                value={formatDeclinableValue(
                  patient.preferred_language,
                  patient.preferred_language_declined
                )}
              />
              <DetailRow
                icon={CircleUserRound}
                label="Pronouns"
                value={patient.pronouns}
              />
              <div className="min-w-0 rounded-xl border border-cf-border bg-cf-surface px-3 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                  <IdCard className="h-3.5 w-3.5" />
                  <span className="min-w-0 truncate">SSN</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold tracking-[0.16em] text-cf-text">
                    {showFullSsn && patient.ssn
                      ? formatFullSsn(patient.ssn)
                      : formatMaskedSsn(patient)}
                  </span>
                  {patient.ssn ? (
                    <button
                      type="button"
                      onClick={onToggleSsn}
                      className="text-xs font-semibold text-cf-primary transition hover:text-cf-primary-hover"
                    >
                      {showFullSsn ? "Hide" : "Show"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader title="Contact" />
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailRow icon={Mail} label="Email" value={patient.email} />
              <DetailRow
                icon={Phone}
                label="Cell Phone"
                value={
                  patient.phones?.find((phone) => phone.label === "cell")
                    ?.number
                }
              />
              <DetailRow
                icon={Phone}
                label="Home Phone"
                value={
                  patient.phones?.find((phone) => phone.label === "home")
                    ?.number
                }
              />
              <DetailRow
                icon={Phone}
                label="Work Phone"
                value={
                  patient.phones?.find((phone) => phone.label === "work")
                    ?.number
                }
              />
              <DetailRow
                icon={MapPin}
                label="Address"
                value={formatAddress(patient.address)}
                className="md:col-span-2 xl:col-span-3"
              />
            </div>
          </div>

          <div>
            <SectionHeader title="Emergency Contacts" />
            {emergencyContacts.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="No emergency contacts"
                  body="Add a contact from Demographics."
                />
              </div>
            ) : (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {emergencyContacts.map((contact, index) => (
                  <div
                    key={contact.id || `${contact.name}-${index}`}
                    className="overflow-hidden rounded-xl border border-cf-border bg-cf-surface shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-cf-border bg-cf-surface-muted/45 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
                          <Siren className="h-4 w-4 shrink-0 text-cf-text-subtle" />
                          <span className="truncate">
                            {contact.name || "—"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {contact.is_primary ? (
                            <Badge variant="success">Primary</Badge>
                          ) : null}
                          {contact.relationship ? (
                            <Badge variant="muted">
                              {contact.relationship}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailRow
                          icon={Phone}
                          label="Phone"
                          value={contact.phone_number}
                        />
                        <DetailRow
                          icon={UserRoundCheck}
                          label="Relationship"
                          value={contact.relationship}
                        />
                      </div>
                      {contact.notes ? (
                        <div className="mt-3 rounded-xl border border-cf-border bg-cf-surface-muted/50 px-3 py-2 text-sm leading-6 text-cf-text-muted">
                          {contact.notes}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
