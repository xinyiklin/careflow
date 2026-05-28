import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import useFacility from "../facilities/hooks/useFacility";
import useFacilityConfig from "../facilities/hooks/useFacilityConfig";
import { fetchPatientById } from "./api/patients";
import { fetchAppointments } from "../appointments/api/appointments";
import useAppointmentFlow from "../appointments/hooks/useAppointmentFlow";
import usePatientClinical from "./hooks/usePatientClinical";
import usePatientHubInsurance from "./hooks/usePatientHubInsurance";
import usePatientBilling from "../../features/billing/hooks/usePatientBilling";
import usePatientHubActions from "./hooks/usePatientHubActions";
import { useVitalsIntakeModal } from "./hooks/useVitalsIntakeModal";
import PatientIdentitySidebar from "./components/PatientHubSidebar";
import PatientHubTabContent from "./components/PatientHubTabContent";
import PatientHubModals from "./components/PatientHubModals";
import { HUB_TABS, TabButton } from "./components/PatientHubSections";
import { getPatientChartName } from "./utils/patientDisplay";
import { getSafeInitialTab } from "./PatientHubContent.helpers";
import type { EntityId } from "../../shared/api/types";
import type { AppointmentLike } from "../../shared/types/domain";
import type {
  AppointmentStaff,
  AppointmentResource,
  AppointmentStatusOption,
  AppointmentTypeOption,
} from "../appointments/types";
import type {
  AppointmentGroup,
  PatientCareProvider,
  PatientEmergencyContact,
  PatientGenderOption,
  PatientHubTabKey,
  PatientRecord,
  PharmacyRecord,
} from "./types";

export function PatientHubContent({
  patientId,
  initialTab = "registration",
  onClose,
}: {
  patientId?: EntityId | null;
  initialTab?: PatientHubTabKey;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { selectedFacilityId, facility, selectedMembership } = useFacility();
  const {
    careProviders,
    genderOptions,
    pharmacies,
    physicians,
    resources,
    staffs,
    statusOptions,
    typeOptions,
  } = useFacilityConfig();
  const appointmentPhysicians = physicians as unknown as AppointmentStaff[];
  const appointmentStaffs = staffs as unknown as AppointmentStaff[];
  const appointmentResources = resources as unknown as AppointmentResource[];
  const appointmentStatusOptions =
    statusOptions as unknown as AppointmentStatusOption[];
  const appointmentTypeOptions =
    typeOptions as unknown as AppointmentTypeOption[];
  const patientGenderOptions =
    genderOptions as unknown as PatientGenderOption[];
  const patientCareProviders =
    careProviders as unknown as PatientCareProvider[];
  const patientPharmacies = pharmacies as unknown as PharmacyRecord[];

  const [activeTab, setActiveTab] = useState(() =>
    getSafeInitialTab(initialTab)
  );
  const securityPermissions =
    selectedMembership?.effective_security_permissions || {};
  const canViewClinical = Boolean(securityPermissions["clinical.view"]);
  const canCreateClinical = Boolean(securityPermissions["clinical.create"]);
  const canUpdateClinical = Boolean(securityPermissions["clinical.update"]);
  const canSignClinical = Boolean(securityPermissions["clinical.sign"]);
  const hasUnsignPermission = Boolean(securityPermissions["clinical.unsign"]);
  const canManageDocumentCategories = Boolean(
    securityPermissions["documents.categories.manage"]
  );
  const canViewMedications = Boolean(securityPermissions["medications.view"]);
  const canManageMedications = Boolean(
    securityPermissions["medications.manage"]
  );
  const canViewAllergies = Boolean(securityPermissions["allergies.view"]);
  const canManageAllergies = Boolean(securityPermissions["allergies.manage"]);
  const canViewInsurance = Boolean(securityPermissions["insurance.view"]);
  const canManageInsurance = Boolean(securityPermissions["insurance.manage"]);
  const canViewBilling = Boolean(securityPermissions["billing.view"]);
  const canManageBilling = Boolean(securityPermissions["billing.manage"]);
  const canViewDocuments = Boolean(securityPermissions["documents.view"]);
  const canManageDocuments = Boolean(securityPermissions["documents.manage"]);

  const appointmentFlow = useAppointmentFlow({
    facility,
    physicians,
    staffs,
    resources,
    statusOptions,
    typeOptions,
  });

  const patientBilling = usePatientBilling({
    facilityId: selectedFacilityId,
    patientId,
    enabled: canViewBilling,
  });

  useEffect(() => {
    setActiveTab(getSafeInitialTab(initialTab));
  }, [initialTab, patientId]);

  const patientQuery = useQuery({
    queryKey: [
      "patientHub",
      "patient",
      selectedFacilityId || null,
      patientId || null,
    ],
    queryFn: () =>
      fetchPatientById(
        patientId as EntityId,
        selectedFacilityId
      ) as Promise<PatientRecord>,
    enabled: !!selectedFacilityId && !!patientId,
  });

  const appointmentsQuery = useQuery({
    queryKey: [
      "patientHub",
      "appointments",
      selectedFacilityId || null,
      patientId || null,
    ],
    queryFn: () =>
      fetchAppointments({
        facilityId: selectedFacilityId,
        patientId,
      }),
    enabled: !!selectedFacilityId && !!patientId,
  });

  const patientClinical = usePatientClinical({
    facilityId: selectedFacilityId,
    patientId,
    enabled: canViewClinical,
  });

  const patient = patientQuery.data || null;
  const patientName = patient ? getPatientChartName(patient) : "Patient";

  const actions = usePatientHubActions({
    patient,
    patientId,
    patientName,
    selectedFacilityId,
    appointmentFlow,
    patientClinical,
    patientBilling,
    canCreateClinical,
  });

  const vitalsModal = useVitalsIntakeModal({
    facilityId: selectedFacilityId,
    onSaved: () => patientClinical.encountersQuery.refetch(),
  });

  const insurance = usePatientHubInsurance({
    facilityId: selectedFacilityId,
    patientId,
    enabled: canViewInsurance,
    onConfirmNeeded: (request) =>
      actions.setConfirmDialogState({
        isOpen: true,
        ...request,
        onConfirm: async () => {
          await request.onConfirm?.();
          actions.closeConfirmDialog();
        },
      }),
  });

  const emergencyContacts = useMemo<PatientEmergencyContact[]>(() => {
    const contacts = Array.isArray(patient?.emergency_contacts)
      ? patient.emergency_contacts
      : [];

    if (contacts.length) return contacts;

    if (
      patient?.emergency_contact_name ||
      patient?.emergency_contact_relationship ||
      patient?.emergency_contact_phone
    ) {
      return [
        {
          name: patient.emergency_contact_name || "",
          relationship: patient.emergency_contact_relationship || "",
          phone_number: patient.emergency_contact_phone || "",
          is_primary: true,
          notes: "",
        },
      ];
    }

    return [];
  }, [patient]);

  const appointments = useMemo(
    () => (Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : []),
    [appointmentsQuery.data]
  );
  const clinicalEncounters = patientClinical.encounters;
  const appointmentGroups = useMemo<AppointmentGroup>(() => {
    const now = new Date();
    const upcoming: AppointmentLike[] = [];
    const recent: AppointmentLike[] = [];

    appointments.forEach((appointment) => {
      const date = new Date(appointment.appointment_time || "");
      if (Number.isNaN(date.getTime())) return;

      if (date >= now) {
        upcoming.push(appointment);
      } else {
        recent.push(appointment);
      }
    });

    upcoming.sort(
      (a, b) =>
        new Date(a.appointment_time || "").getTime() -
        new Date(b.appointment_time || "").getTime()
    );
    recent.sort(
      (a, b) =>
        new Date(b.appointment_time || "").getTime() -
        new Date(a.appointment_time || "").getTime()
    );

    return { upcoming, recent };
  }, [appointments]);

  if (!patientId) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-full min-h-0 w-full flex-1 bg-cf-page-bg">
        {patient ? (
          <PatientIdentitySidebar
            patient={patient}
            patientName={patientName}
            insurancePolicies={insurance.insurancePolicies}
            appointmentGroups={appointmentGroups}
          />
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-none items-center bg-cf-surface px-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-end gap-0">
                {HUB_TABS.map((tab) => (
                  <TabButton
                    key={tab.key}
                    tab={tab}
                    isActive={activeTab === tab.key}
                    onClick={setActiveTab}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-muted hover:text-cf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25"
              aria-label="Close patient hub"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={[
              "min-h-0 flex-1 bg-cf-page-bg",
              activeTab === "documents"
                ? "flex overflow-hidden"
                : "overflow-auto px-5 py-4",
            ].join(" ")}
          >
            <PatientHubTabContent
              activeTab={activeTab}
              patient={patient}
              patientId={patientId || null}
              facilityId={selectedFacilityId}
              timeZone={facility?.timezone ?? undefined}
              patientQuery={{
                isLoading: patientQuery.isLoading,
                error: patientQuery.error,
                refetch: () => void patientQuery.refetch(),
              }}
              insurancePolicies={insurance.insurancePolicies}
              insurancePoliciesQuery={insurance.insurancePoliciesQuery}
              appointmentGroups={appointmentGroups}
              clinicalEncounters={clinicalEncounters}
              billingRecords={patientBilling.billingRecords}
              emergencyContacts={emergencyContacts}
              genderOptions={patientGenderOptions}
              careProviders={patientCareProviders}
              pharmacies={patientPharmacies}
              canViewClinical={canViewClinical}
              canCreateClinical={canCreateClinical}
              canViewMedications={canViewMedications}
              canManageMedications={canManageMedications}
              canViewAllergies={canViewAllergies}
              canManageAllergies={canManageAllergies}
              canViewInsurance={canViewInsurance}
              canManageInsurance={canManageInsurance}
              canViewBilling={canViewBilling}
              canManageBilling={canManageBilling}
              canViewDocuments={canViewDocuments}
              canManageDocuments={canManageDocuments}
              canManageDocumentCategories={canManageDocumentCategories}
              clinicalQuery={{
                isLoading: patientClinical.encountersQuery.isLoading,
                error: patientClinical.encountersQuery.error,
                refetch: () => void patientClinical.encountersQuery.refetch(),
              }}
              billingQuery={{
                isLoading: patientBilling.billingRecordsQuery.isLoading,
                error: patientBilling.billingRecordsQuery.error,
                refetch: () =>
                  void patientBilling.billingRecordsQuery.refetch(),
              }}
              billingError={actions.billingError}
              billingSaving={
                patientBilling.createBillingRecordMutation.isPending ||
                patientBilling.updateBillingRecordMutation.isPending
              }
              onOpenPolicyModal={insurance.openPolicyModal}
              onOpenAppointment={actions.handleOpenAppointment}
              onScheduleEncounter={actions.handleScheduleEncounter}
              onOpenProgressNote={actions.handleOpenProgressNote}
              onOpenVitals={(encounter) => void vitalsModal.open({ encounter })}
              onStartClinicalEncounter={actions.handleStartClinicalEncounter}
              onSaveBillingRecord={actions.handleSaveBillingRecord}
              onSwitchToInsurance={() => setActiveTab("insurance")}
              onDocumentUploaded={() => {
                queryClient.invalidateQueries({
                  queryKey: [
                    "patientHub",
                    "patient",
                    selectedFacilityId || null,
                    patientId || null,
                  ],
                });
              }}
            />
          </div>
        </section>
      </div>

      <PatientHubModals
        facilityId={selectedFacilityId}
        timeZone={facility?.timezone ?? undefined}
        patientName={patientName}
        insurance={{
          isPolicyModalOpen: insurance.isPolicyModalOpen,
          editingPolicy: insurance.editingPolicy,
          carriers: insurance.carriers,
          saving: insurance.saving,
          onClose: insurance.closePolicyModal,
          onSubmit: canManageInsurance ? insurance.submitPolicy : undefined,
          onDelete:
            canManageInsurance && insurance.editingPolicy
              ? insurance.requestDeletePolicy
              : undefined,
        }}
        appointment={{
          modal: appointmentFlow.modal,
          selectedPatient: appointmentFlow.selectedPatient,
          setSelectedPatient: appointmentFlow.setSelectedPatient,
          physicians: appointmentPhysicians,
          staffs: appointmentStaffs,
          resources: appointmentResources,
          statusOptions: appointmentStatusOptions,
          typeOptions: appointmentTypeOptions,
          error: actions.appointmentError,
          onSubmit: actions.handleSubmitAppointment,
          onClose: actions.handleCloseAppointmentModal,
          onDelete: actions.handleDeleteAppointment,
          onOpenHistory: actions.handleOpenAppointmentHistory,
          onEditSessionBlocked: actions.showEditBlockedDialog,
        }}
        historyModal={{
          ...actions.historyModalState,
          onClose: actions.closeHistoryModal,
        }}
        progressNote={{
          state: actions.progressNoteModalState,
          providers: appointmentPhysicians as unknown as PatientCareProvider[],
          canEdit: actions.progressNoteModalState.encounter
            ? canUpdateClinical
            : canCreateClinical,
          canSign:
            canSignClinical ||
            Boolean(
              selectedMembership?.id &&
              actions.progressNoteModalState.encounter?.rendering_provider &&
              String(selectedMembership.id) ===
                String(
                  actions.progressNoteModalState.encounter.rendering_provider
                )
            ),
          canUnsign:
            hasUnsignPermission ||
            Boolean(
              selectedMembership?.id &&
              actions.progressNoteModalState.encounter?.rendering_provider &&
              String(selectedMembership.id) ===
                String(
                  actions.progressNoteModalState.encounter.rendering_provider
                )
            ),
          saving:
            patientClinical.createEncounterMutation.isPending ||
            patientClinical.updateEncounterMutation.isPending ||
            patientClinical.updateProgressNoteMutation.isPending,
          signing: patientClinical.signProgressNoteMutation.isPending,
          unsigning: patientClinical.unsignProgressNoteMutation.isPending,
          error: actions.progressNoteError,
          onClose: actions.closeProgressNoteModal,
          onSaveDraft: actions.handleSaveProgressNoteDraft,
          onSign: actions.handleSignProgressNote,
          onUnsign: actions.handleUnsignProgressNote,
        }}
        vitals={{
          state: vitalsModal.state,
          saving: vitalsModal.saving,
          error: vitalsModal.error,
          onClose: vitalsModal.close,
          onSubmit: async (values) => {
            await vitalsModal.submit({ values });
          },
        }}
        confirmDialog={{
          ...actions.confirmDialogState,
          onCancel: actions.closeConfirmDialog,
        }}
        editBlockedDialog={{
          ...actions.editBlockedDialogState,
          onClose: actions.closeEditBlockedDialog,
        }}
      />
    </div>
  );
}
