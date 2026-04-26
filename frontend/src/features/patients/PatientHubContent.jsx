import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleUserRound } from "lucide-react";
import useFacility from "../facilities/hooks/useFacility";
import useFacilityConfig from "../facilities/hooks/useFacilityConfig";
import { fetchPatientById } from "./api/patients";
import {
  createPatientInsurancePolicy,
  deletePatientInsurancePolicy,
  fetchInsuranceCarriers,
  fetchPatientInsurancePolicies,
  updatePatientInsurancePolicy,
} from "./api/insurance";
import { fetchAppointments } from "../appointments/api/appointments";
import AppointmentHistoryModal from "../appointments/components/AppointmentHistoryModal";
import AppointmentModal from "../appointments/components/AppointmentModal";
import useAppointmentFlow from "../appointments/hooks/useAppointmentFlow";
import useAppointmentMutations from "../appointments/hooks/useAppointmentMutations";
import PatientDocumentsWorkspace from "../documents/components/PatientDocumentsWorkspace";
import InsurancePolicyModal from "./components/InsurancePolicyModal";
import PatientIdentitySidebar, {
  getPatientChartName,
  getPrimaryPhone,
} from "./components/PatientHubSidebar";
import {
  AppointmentsTab,
  buildAppointmentPatientSnapshot,
  EmptyClinicalTab,
  InsuranceTab,
  PATIENT_HUB_EMPTY_TABS,
} from "./components/PatientHubTabPanels";
import HubRegistrationInline from "./components/hub/HubRegistrationInline";
import {
  findConflictingInsurancePolicy,
  formatCoverageOrder,
  formatPolicyDateRange,
  HUB_TABS,
  TabButton,
} from "./components/PatientHubSections";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import { Panel } from "../../shared/components/ui";
import { getTodayInTimeZone } from "../../shared/utils/dateTime";

export function PatientHubContent({ patientId }) {
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

  const [activeTab, setActiveTab] = useState("registration");
  const canManageDocumentCategories = Boolean(
    selectedMembership?.effective_security_permissions?.[
      "documents.categories.manage"
    ]
  );
  const [appointmentError, setAppointmentError] = useState("");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [historyModalState, setHistoryModalState] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
    appointmentTime: "",
  });
  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
    onConfirm: null,
  });
  const appointmentSelectedDate = facility?.timezone
    ? getTodayInTimeZone(facility.timezone)
    : new Date().toISOString().slice(0, 10);
  const appointmentFlow = useAppointmentFlow({
    facility,
    physicians,
    staffs,
    resources,
    statusOptions,
    typeOptions,
    selectedDate: appointmentSelectedDate,
  });

  const patientQuery = useQuery({
    queryKey: [
      "patientHub",
      "patient",
      selectedFacilityId || null,
      patientId || null,
    ],
    queryFn: () => fetchPatientById(patientId, selectedFacilityId),
    enabled: !!selectedFacilityId && !!patientId,
  });

  const insurancePoliciesQuery = useQuery({
    queryKey: [
      "patientHub",
      "insurancePolicies",
      selectedFacilityId || null,
      patientId || null,
    ],
    queryFn: () =>
      fetchPatientInsurancePolicies({
        facilityId: selectedFacilityId,
        patientId,
      }),
    enabled: !!selectedFacilityId && !!patientId,
  });

  const carriersQuery = useQuery({
    queryKey: ["patientHub", "insuranceCarriers"],
    queryFn: fetchInsuranceCarriers,
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

  const insuranceMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      if (id) {
        return updatePatientInsurancePolicy(selectedFacilityId, id, values);
      }
      return createPatientInsurancePolicy(selectedFacilityId, {
        ...values,
        patient: Number(patientId),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "patientHub",
          "insurancePolicies",
          selectedFacilityId || null,
          patientId || null,
        ],
      });
      setEditingPolicy(null);
      setIsPolicyModalOpen(false);
    },
  });

  const deleteInsuranceMutation = useMutation({
    mutationFn: (id) => deletePatientInsurancePolicy(selectedFacilityId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "patientHub",
          "insurancePolicies",
          selectedFacilityId || null,
          patientId || null,
        ],
      });
      setEditingPolicy(null);
      setIsPolicyModalOpen(false);
      setConfirmDialogState({
        isOpen: false,
        title: "",
        message: "",
        confirmText: "Confirm",
        cancelText: "Cancel",
        variant: "default",
        onConfirm: null,
      });
    },
  });

  const patient = patientQuery.data || null;
  const patientName = patient ? getPatientChartName(patient) : "Patient";
  const primaryPhone = getPrimaryPhone(patient);
  const emergencyContacts = useMemo(() => {
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
          name: patient.emergency_contact_name,
          relationship: patient.emergency_contact_relationship,
          phone_number: patient.emergency_contact_phone,
          is_primary: true,
        },
      ];
    }

    return [];
  }, [patient]);
  const insurancePolicies = useMemo(
    () =>
      Array.isArray(insurancePoliciesQuery.data)
        ? insurancePoliciesQuery.data
        : [],
    [insurancePoliciesQuery.data]
  );
  const carriers = Array.isArray(carriersQuery.data) ? carriersQuery.data : [];
  const appointments = useMemo(
    () => (Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : []),
    [appointmentsQuery.data]
  );
  const appointmentGroups = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const recent = [];

    appointments.forEach((appointment) => {
      const date = new Date(appointment.appointment_time);
      if (Number.isNaN(date.getTime())) return;

      if (date >= now) {
        upcoming.push(appointment);
      } else {
        recent.push(appointment);
      }
    });

    upcoming.sort(
      (a, b) => new Date(a.appointment_time) - new Date(b.appointment_time)
    );
    recent.sort(
      (a, b) => new Date(b.appointment_time) - new Date(a.appointment_time)
    );

    return {
      upcoming,
      recent,
    };
  }, [appointments]);
  const invalidatePatientHubAppointments = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        "patientHub",
        "appointments",
        selectedFacilityId || null,
        patientId || null,
      ],
    });
  }, [patientId, queryClient, selectedFacilityId]);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialogState({
      isOpen: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      onConfirm: null,
    });
  }, []);

  const handleCloseAppointmentModal = useCallback(() => {
    setAppointmentError("");
    closeConfirmDialog();
    appointmentFlow.modal.close();
  }, [appointmentFlow.modal, closeConfirmDialog]);

  const {
    deleteMutation: deleteAppointmentMutation,
    saveMutation: saveAppointmentMutation,
    getDuplicateDayAppointmentError,
  } = useAppointmentMutations({
    onCloseModal: handleCloseAppointmentModal,
    setError: setAppointmentError,
  });

  const handleSubmitAppointment = useCallback(
    async (submittedData) => {
      setAppointmentError("");

      const buildPayload = (overrides = {}) => ({
        ...submittedData,
        patient: appointmentFlow.selectedPatient?.id || "",
        resource: submittedData.resource
          ? Number(submittedData.resource)
          : null,
        rendering_provider: submittedData.rendering_provider
          ? Number(submittedData.rendering_provider)
          : null,
        status: submittedData.status ? Number(submittedData.status) : "",
        appointment_type: submittedData.appointment_type
          ? Number(submittedData.appointment_type)
          : "",
        facility: submittedData.facility ? Number(submittedData.facility) : "",
        ...overrides,
      });

      try {
        await saveAppointmentMutation.mutateAsync({
          id: appointmentFlow.modal.editingId,
          data: buildPayload(),
        });
        await invalidatePatientHubAppointments();
      } catch (err) {
        const duplicateError = getDuplicateDayAppointmentError(err);
        if (!duplicateError) return;

        setAppointmentError("");
        setConfirmDialogState({
          isOpen: true,
          title: "Possible Double Booking",
          message:
            "This patient already has an appointment on this date. Creating another appointment may result in a double booking. Do you want to proceed anyway?",
          confirmText: "Confirm",
          cancelText: "Cancel",
          variant: "warning",
          onConfirm: async () => {
            await saveAppointmentMutation.mutateAsync({
              id: appointmentFlow.modal.editingId,
              data: buildPayload({ allow_same_day_double_book: true }),
            });
            await invalidatePatientHubAppointments();
            closeConfirmDialog();
          },
        });
      }
    },
    [
      appointmentFlow.modal.editingId,
      appointmentFlow.selectedPatient?.id,
      closeConfirmDialog,
      getDuplicateDayAppointmentError,
      invalidatePatientHubAppointments,
      saveAppointmentMutation,
    ]
  );

  const handleDeleteAppointment = useCallback(() => {
    if (!appointmentFlow.modal.editingId) return;

    setConfirmDialogState({
      isOpen: true,
      title: "Delete Appointment",
      message: "Are you sure you want to delete this appointment?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteAppointmentMutation.mutateAsync(
          appointmentFlow.modal.editingId
        );
        await invalidatePatientHubAppointments();
        closeConfirmDialog();
      },
    });
  }, [
    appointmentFlow.modal.editingId,
    closeConfirmDialog,
    deleteAppointmentMutation,
    invalidatePatientHubAppointments,
  ]);

  const handleOpenAppointment = useCallback(
    (appointment) => {
      if (!appointment) return;
      appointmentFlow.modal.openEdit(appointment);
    },
    [appointmentFlow.modal]
  );

  const handleScheduleEncounter = useCallback(() => {
    if (!patient) return;

    appointmentFlow.modal.openCreate();
    appointmentFlow.setSelectedPatient(
      buildAppointmentPatientSnapshot(patient)
    );
  }, [appointmentFlow, patient]);

  const handleOpenAppointmentHistory = useCallback(() => {
    if (!appointmentFlow.modal.editingId) return;

    setHistoryModalState({
      isOpen: true,
      appointmentId: appointmentFlow.modal.editingId,
      patientName:
        appointmentFlow.selectedPatient?.display_name ||
        appointmentFlow.selectedPatient?.full_name ||
        patientName ||
        "",
      appointmentTime: appointmentFlow.modal.formData.appointment_time,
    });
  }, [
    appointmentFlow.modal.editingId,
    appointmentFlow.modal.formData.appointment_time,
    appointmentFlow.selectedPatient?.display_name,
    appointmentFlow.selectedPatient?.full_name,
    patientName,
  ]);

  const openPolicyModal = (policy = null) => {
    setEditingPolicy(policy);
    setIsPolicyModalOpen(true);
  };

  const handleSubmitInsurancePolicy = (values) => {
    const editingPolicyId = editingPolicy?.id || null;
    const conflictingPolicy = findConflictingInsurancePolicy(
      insurancePolicies,
      values,
      editingPolicyId
    );

    const savePolicy = async () =>
      insuranceMutation.mutateAsync({
        id: editingPolicyId,
        values,
      });

    if (!conflictingPolicy) {
      return savePolicy();
    }

    const coverageLabel = formatCoverageOrder(
      values.coverage_order,
      values.is_primary
    ).toLowerCase();
    const carrierLabel = conflictingPolicy.carrier_name || "another policy";

    setConfirmDialogState({
      isOpen: true,
      title: "Overlapping Insurance Policy",
      message: `This patient already has an active ${coverageLabel} insurance policy for ${carrierLabel} during ${formatPolicyDateRange(conflictingPolicy)}. You can keep both policies if this is intentional.`,
      confirmText: "Save Anyway",
      cancelText: "Review Policy",
      variant: "warning",
      onConfirm: async () => {
        await savePolicy();
        setConfirmDialogState({
          isOpen: false,
          title: "",
          message: "",
          confirmText: "Confirm",
          cancelText: "Cancel",
          variant: "default",
          onConfirm: null,
        });
      },
    });

    return null;
  };

  if (!patientId) {
    return null;
  }

  let content = null;

  if (patientQuery.isLoading) {
    content = (
      <Panel
        icon={CircleUserRound}
        title="Loading patient"
        className="h-full min-h-[360px]"
      />
    );
  } else if (patientQuery.error || !patient) {
    content = (
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
  } else if (activeTab === "insurance") {
    content = (
      <InsuranceTab
        insurancePolicies={insurancePolicies}
        insurancePoliciesQuery={insurancePoliciesQuery}
        onOpenPolicy={openPolicyModal}
      />
    );
  } else if (PATIENT_HUB_EMPTY_TABS[activeTab]) {
    content = <EmptyClinicalTab {...PATIENT_HUB_EMPTY_TABS[activeTab]} />;
  } else if (activeTab === "documents") {
    content = (
      <PatientDocumentsWorkspace
        compact
        title="Patient Documents"
        patient={patient}
        facilityId={selectedFacilityId}
        canManageCategories={canManageDocumentCategories}
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
    );
  } else if (activeTab === "appointments") {
    content = (
      <AppointmentsTab
        appointmentGroups={appointmentGroups}
        onOpenAppointment={handleOpenAppointment}
        onSchedule={handleScheduleEncounter}
      />
    );
  } else {
    content = (
      <HubRegistrationInline
        patient={patient}
        facilityId={selectedFacilityId}
        genderOptions={genderOptions}
        careProviders={careProviders}
        pharmacies={pharmacies}
        insurancePolicies={insurancePolicies}
        emergencyContacts={emergencyContacts}
        onSwitchToInsurance={() => setActiveTab("insurance")}
      />
    );
  }

  const shell = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-full min-h-0 w-full flex-1 bg-cf-page-bg">
        {patient ? (
          <PatientIdentitySidebar
            patient={patient}
            patientName={patientName}
            primaryPhone={primaryPhone}
            insurancePolicies={insurancePolicies}
            appointmentGroups={appointmentGroups}
          />
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-none overflow-x-auto border-b border-cf-border bg-cf-surface pr-16">
            <div className="flex items-end gap-0 px-4 whitespace-nowrap">
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

          <div
            className={[
              "min-h-0 flex-1 bg-cf-page-bg",
              activeTab === "documents"
                ? "flex overflow-hidden"
                : "overflow-auto px-5 py-4",
            ].join(" ")}
          >
            {content}
          </div>
        </section>
      </div>

      <InsurancePolicyModal
        isOpen={isPolicyModalOpen}
        policy={editingPolicy}
        carriers={carriers}
        saving={
          insuranceMutation.isPending || deleteInsuranceMutation.isPending
        }
        onClose={() => {
          setEditingPolicy(null);
          setIsPolicyModalOpen(false);
        }}
        onSubmit={(values) => handleSubmitInsurancePolicy(values)}
        onDelete={
          editingPolicy
            ? () =>
                setConfirmDialogState({
                  isOpen: true,
                  title: "Remove Insurance Policy",
                  message:
                    "Are you sure you want to remove this insurance policy from the patient record?",
                  confirmText: "Remove",
                  cancelText: "Cancel",
                  variant: "danger",
                  onConfirm: async () =>
                    deleteInsuranceMutation.mutateAsync(editingPolicy.id),
                })
            : undefined
        }
      />

      <AppointmentModal
        isOpen={appointmentFlow.modal.isOpen}
        mode={appointmentFlow.modal.mode}
        formData={appointmentFlow.modal.formData}
        facilityId={selectedFacilityId}
        physicians={physicians}
        staffs={staffs}
        resources={resources}
        statusOptions={statusOptions}
        typeOptions={typeOptions}
        error={appointmentError}
        onSubmit={handleSubmitAppointment}
        onClose={handleCloseAppointmentModal}
        onDelete={handleDeleteAppointment}
        onOpenHistory={handleOpenAppointmentHistory}
        selectedPatient={appointmentFlow.selectedPatient}
        onSelectPatient={appointmentFlow.setSelectedPatient}
        timeZone={facility?.timezone}
      />

      <AppointmentHistoryModal
        isOpen={historyModalState.isOpen}
        appointmentId={historyModalState.appointmentId}
        facilityId={selectedFacilityId}
        patientName={historyModalState.patientName}
        appointmentTime={historyModalState.appointmentTime}
        timeZone={facility?.timezone}
        onClose={() =>
          setHistoryModalState({
            isOpen: false,
            appointmentId: null,
            patientName: "",
            appointmentTime: "",
          })
        }
      />

      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        variant={confirmDialogState.variant}
        onConfirm={confirmDialogState.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  );

  return shell;
}
