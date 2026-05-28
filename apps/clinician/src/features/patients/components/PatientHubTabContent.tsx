import { CircleUserRound } from "lucide-react";

import PatientDocumentsWorkspace from "../../documents/components/PatientDocumentsWorkspace";
import { AppointmentsTab, InsuranceTab } from "./PatientHubTabPanels";
import PatientAllergiesTab from "./PatientAllergiesTab";
import PatientBillingTab from "../../billing/components/PatientBillingTab";
import { ClinicalChartingTab } from "./PatientClinicalTabs";
import PatientMedicationsTab from "./medications/PatientMedicationsTab";
import PatientTimelineTab from "./timeline/PatientTimelineTab";
import HubRegistrationInline from "./hub/HubRegistrationInline";
import { Button, Panel } from "../../../shared/components/ui";

import type { UseQueryResult } from "@tanstack/react-query";
import type { EntityId } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";
import type {
  ClinicalEncounter,
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
} from "../../billing/types";
import type {
  AppointmentGroup,
  PatientCareProvider,
  PatientEmergencyContact,
  PatientGenderOption,
  PatientHubInsurancePolicy,
  PatientHubTabKey,
  PatientRecord,
  PharmacyRecord,
} from "../types";

type QueryState = {
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
};

type PatientHubTabContentProps = {
  activeTab: PatientHubTabKey;
  patient: PatientRecord | null;
  patientId: EntityId | null;
  facilityId: EntityId | null;
  timeZone?: string | null;
  patientQuery: QueryState;
  insurancePolicies: PatientHubInsurancePolicy[];
  insurancePoliciesQuery: UseQueryResult<PatientHubInsurancePolicy[] | null>;
  appointmentGroups: AppointmentGroup;
  clinicalEncounters: ClinicalEncounter[];
  billingRecords: EncounterBillingRecord[];
  emergencyContacts: PatientEmergencyContact[];
  genderOptions: PatientGenderOption[];
  careProviders: PatientCareProvider[];
  pharmacies: PharmacyRecord[];
  canViewClinical: boolean;
  canCreateClinical: boolean;
  canViewMedications: boolean;
  canManageMedications: boolean;
  canViewAllergies: boolean;
  canManageAllergies: boolean;
  canViewInsurance: boolean;
  canManageInsurance: boolean;
  canViewBilling: boolean;
  canManageBilling: boolean;
  canViewDocuments: boolean;
  canManageDocuments: boolean;
  canManageDocumentCategories: boolean;
  clinicalQuery: QueryState;
  billingQuery: QueryState;
  billingError: string;
  billingSaving: boolean;
  onOpenPolicyModal: (policy?: PatientHubInsurancePolicy | null) => void;
  onOpenAppointment: (appointment: AppointmentLike) => Promise<void>;
  onScheduleEncounter: () => void;
  onOpenProgressNote: (encounter: ClinicalEncounter) => void;
  onOpenVitals?: (encounter: ClinicalEncounter) => void;
  onStartClinicalEncounter: (appointment?: AppointmentLike | null) => void;
  onSaveBillingRecord: (
    record: EncounterBillingRecord | null,
    values: EncounterBillingRecordPayload
  ) => Promise<void>;
  onSwitchToInsurance: () => void;
  onDocumentUploaded: () => void;
};

function UnavailablePanel({ label }: { label: string }) {
  return (
    <Panel
      icon={CircleUserRound}
      title={`${label} unavailable`}
      tone="subtle"
      className="h-full min-h-[260px]"
    >
      <div className="text-sm text-cf-text-muted">
        This role cannot view {label.toLowerCase()}.
      </div>
    </Panel>
  );
}

export default function PatientHubTabContent(props: PatientHubTabContentProps) {
  const { activeTab, patient, patientQuery } = props;

  if (patientQuery.isLoading) {
    return (
      <Panel icon={CircleUserRound} title="" className="h-full min-h-[360px]" />
    );
  }

  if (patientQuery.error) {
    return (
      <Panel
        icon={CircleUserRound}
        title="Couldn't load this patient"
        tone="subtle"
        className="h-full min-h-[360px]"
      >
        <div className="text-sm text-cf-text-muted">
          Check your connection and try again.
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3"
          onClick={patientQuery.refetch}
        >
          Retry
        </Button>
      </Panel>
    );
  }

  if (!patient) {
    return (
      <Panel
        icon={CircleUserRound}
        title="Patient not found"
        tone="subtle"
        className="h-full min-h-[360px]"
      >
        <div className="text-sm text-cf-text-muted">
          Open another chart from global patient search.
        </div>
      </Panel>
    );
  }

  if (activeTab === "insurance") {
    return props.canViewInsurance ? (
      <InsuranceTab
        insurancePolicies={props.insurancePolicies}
        insurancePoliciesQuery={props.insurancePoliciesQuery}
        canManage={props.canManageInsurance}
        onOpenPolicy={props.onOpenPolicyModal}
      />
    ) : (
      <UnavailablePanel label="Insurance" />
    );
  }

  if (activeTab === "medications") {
    return props.canViewMedications ? (
      <PatientMedicationsTab
        facilityId={props.facilityId}
        patientId={props.patientId}
        canManage={props.canManageMedications}
      />
    ) : (
      <UnavailablePanel label="Medications" />
    );
  }

  if (activeTab === "allergies") {
    return props.canViewAllergies ? (
      <PatientAllergiesTab
        facilityId={props.facilityId}
        patientId={props.patientId}
        canManage={props.canManageAllergies}
      />
    ) : (
      <UnavailablePanel label="Allergies" />
    );
  }

  if (activeTab === "notes") {
    return props.canViewClinical ? (
      <ClinicalChartingTab
        encounters={props.clinicalEncounters}
        appointmentGroups={props.appointmentGroups}
        queryState={props.clinicalQuery}
        canCreate={props.canCreateClinical}
        onOpenEncounter={props.onOpenProgressNote}
        onOpenVitals={props.onOpenVitals}
        onStartEncounter={props.onStartClinicalEncounter}
        onOpenAppointment={props.onOpenAppointment}
      />
    ) : (
      <UnavailablePanel label="Clinical charting" />
    );
  }

  if (activeTab === "billing") {
    return props.canViewBilling ? (
      <PatientBillingTab
        billingRecords={props.billingRecords}
        clinicalEncounters={props.clinicalEncounters}
        insurancePolicies={props.insurancePolicies}
        queryState={props.billingQuery}
        canManage={props.canManageBilling}
        saving={props.billingSaving}
        error={props.billingError}
        onSave={props.onSaveBillingRecord}
        onOpenClinicalRecord={props.onOpenProgressNote}
        onOpenAppointment={props.onOpenAppointment}
      />
    ) : (
      <UnavailablePanel label="Billing" />
    );
  }

  if (activeTab === "documents") {
    return props.canViewDocuments ? (
      <PatientDocumentsWorkspace
        compact
        title="Patient Documents"
        patient={patient}
        facilityId={props.facilityId}
        canManageDocuments={props.canManageDocuments}
        canManageCategories={props.canManageDocumentCategories}
        onDocumentUploaded={props.onDocumentUploaded}
      />
    ) : (
      <UnavailablePanel label="Documents" />
    );
  }

  if (activeTab === "appointments") {
    return (
      <AppointmentsTab
        appointmentGroups={props.appointmentGroups}
        onOpenAppointment={props.onOpenAppointment}
        onSchedule={props.onScheduleEncounter}
      />
    );
  }

  if (activeTab === "timeline") {
    return (
      <PatientTimelineTab
        facilityId={props.facilityId}
        patientId={props.patientId}
        appointmentGroups={props.appointmentGroups}
        clinicalEncounters={props.clinicalEncounters}
        canViewClinical={props.canViewClinical}
        canViewMedications={props.canViewMedications}
        canViewAllergies={props.canViewAllergies}
        timeZone={props.timeZone}
      />
    );
  }

  return (
    <HubRegistrationInline
      patient={patient}
      facilityId={props.facilityId}
      genderOptions={props.genderOptions}
      careProviders={props.careProviders}
      pharmacies={props.pharmacies}
      insurancePolicies={props.insurancePolicies}
      emergencyContacts={props.emergencyContacts}
      onSwitchToInsurance={props.onSwitchToInsurance}
    />
  );
}
