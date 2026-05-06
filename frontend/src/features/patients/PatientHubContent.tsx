import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleUserRound, X } from "lucide-react";
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
import {
  beginAppointmentEditSession,
  fetchAppointments,
} from "../appointments/api/appointments";
import AppointmentEditBlockedDialog from "../appointments/components/AppointmentEditBlockedDialog";
import AppointmentHistoryModal from "../appointments/components/AppointmentHistoryModal";
import AppointmentModal from "../appointments/components/AppointmentModal";
import useAppointmentFlow from "../appointments/hooks/useAppointmentFlow";
import useAppointmentMutations from "../appointments/hooks/useAppointmentMutations";
import PatientDocumentsWorkspace from "../documents/components/PatientDocumentsWorkspace";
import InsurancePolicyModal from "./components/InsurancePolicyModal";
import PatientIdentitySidebar from "./components/PatientHubSidebar";
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
import { getPatientChartName } from "./utils/patientDisplay";
import type { ApiPayload, EntityId } from "../../shared/api/types";
import type { AppointmentLike } from "../../shared/types/domain";
import type { AppointmentEditSessionActiveEditor } from "../appointments/api/appointments";
import type {
  AppointmentMode,
  AppointmentResource,
  AppointmentStaff,
  AppointmentStatusOption,
  AppointmentSubmitPayload,
  AppointmentTypeOption,
} from "../appointments/types";
import type {
  AppointmentGroup,
  InsuranceCarrier,
  InsurancePolicyPayload,
  InsurancePolicyFormValues,
  PatientEmergencyContact,
  PatientCareProvider,
  PatientGenderOption,
  PatientHubInsurancePolicy,
  PatientHubTabKey,
  PatientRecord,
  PharmacyRecord,
} from "./types";

type ConfirmDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: "default" | "danger" | "warning";
  onConfirm: (() => void | Promise<void>) | null;
};

type HistoryModalState = {
  isOpen: boolean;
  appointmentId: EntityId | null;
  patientName: string;
  appointmentTime: string;
};

type EditBlockedDialogState = {
  isOpen: boolean;
  activeEditor: AppointmentEditSessionActiveEditor;
};

type InsuranceMutationArgs = {
  id?: EntityId | null;
  values: InsurancePolicyFormValues | InsurancePolicyPayload;
};

type AppointmentFlowOptions = Parameters<typeof useAppointmentFlow>[0];

function getSafeInitialTab(initialTab?: PatientHubTabKey): PatientHubTabKey {
  return initialTab && HUB_TABS.some((tab) => tab.key === initialTab)
    ? initialTab
    : "registration";
}

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
  const flowPhysicians =
    physicians as unknown as AppointmentFlowOptions["physicians"];
  const flowStaffs = staffs as unknown as AppointmentFlowOptions["staffs"];
  const flowResources =
    resources as unknown as AppointmentFlowOptions["resources"];
  const flowStatusOptions =
    statusOptions as unknown as AppointmentFlowOptions["statusOptions"];
  const flowTypeOptions =
    typeOptions as unknown as AppointmentFlowOptions["typeOptions"];

  const [activeTab, setActiveTab] = useState(() =>
    getSafeInitialTab(initialTab)
  );
  const canManageDocumentCategories = Boolean(
    selectedMembership?.effective_security_permissions?.[
      "documents.categories.manage"
    ]
  );
  const [appointmentError, setAppointmentError] = useState("");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] =
    useState<PatientHubInsurancePolicy | null>(null);
  const [historyModalState, setHistoryModalState] = useState<HistoryModalState>(
    {
      isOpen: false,
      appointmentId: null,
      patientName: "",
      appointmentTime: "",
    }
  );
  const [editBlockedDialogState, setEditBlockedDialogState] =
    useState<EditBlockedDialogState>({
      isOpen: false,
      activeEditor: null,
    });
  const [confirmDialogState, setConfirmDialogState] =
    useState<ConfirmDialogState>({
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
    physicians: flowPhysicians,
    staffs: flowStaffs,
    resources: flowResources,
    statusOptions: flowStatusOptions,
    typeOptions: flowTypeOptions,
    selectedDate: appointmentSelectedDate,
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
    mutationFn: async ({ id, values }: InsuranceMutationArgs) => {
      if (id) {
        return updatePatientInsurancePolicy(
          selectedFacilityId,
          id,
          values as ApiPayload
        );
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
    mutationFn: (id: EntityId) =>
      deletePatientInsurancePolicy(selectedFacilityId, id),
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
  const insurancePolicies = useMemo(
    () =>
      Array.isArray(insurancePoliciesQuery.data)
        ? (insurancePoliciesQuery.data as PatientHubInsurancePolicy[])
        : [],
    [insurancePoliciesQuery.data]
  );
  const carriers: InsuranceCarrier[] = Array.isArray(carriersQuery.data)
    ? (carriersQuery.data as InsuranceCarrier[])
    : [];
  const appointments = useMemo(
    () => (Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : []),
    [appointmentsQuery.data]
  );
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

  const closeEditBlockedDialog = useCallback(() => {
    setEditBlockedDialogState({
      isOpen: false,
      activeEditor: null,
    });
  }, []);

  const showEditBlockedDialog = useCallback(
    (activeEditor: AppointmentEditSessionActiveEditor) => {
      setEditBlockedDialogState({
        isOpen: true,
        activeEditor,
      });
    },
    []
  );

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
    async (submittedData: AppointmentSubmitPayload) => {
      setAppointmentError("");

      const buildPayload = (overrides: ApiPayload = {}) => ({
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
    const appointmentId = appointmentFlow.modal.editingId;
    if (!appointmentId) return;

    setConfirmDialogState({
      isOpen: true,
      title: "Delete Appointment",
      message: "Are you sure you want to delete this appointment?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteAppointmentMutation.mutateAsync(appointmentId);
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
    async (appointment: AppointmentLike) => {
      if (!appointment?.id || !selectedFacilityId) return;

      setAppointmentError("");

      try {
        const result = await beginAppointmentEditSession(
          selectedFacilityId,
          appointment.id
        );

        if (result?.status === "occupied") {
          showEditBlockedDialog(result.active_editor ?? null);
          return;
        }

        appointmentFlow.modal.openEdit(appointment);
      } catch {
        setAppointmentError("Appointment could not be opened. Try again.");
      }
    },
    [appointmentFlow.modal, selectedFacilityId, showEditBlockedDialog]
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
      patientName: patientName || "",
      appointmentTime: appointmentFlow.modal.formData.appointment_time,
    });
  }, [
    appointmentFlow.modal.editingId,
    appointmentFlow.modal.formData.appointment_time,
    patientName,
  ]);

  const openPolicyModal = (policy: PatientHubInsurancePolicy | null = null) => {
    setEditingPolicy(policy);
    setIsPolicyModalOpen(true);
  };

  const handleSubmitInsurancePolicy = (
    values: InsurancePolicyFormValues | InsurancePolicyPayload
  ) => {
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

  let content: ReactNode = null;

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
    const emptyTab = PATIENT_HUB_EMPTY_TABS[activeTab];
    content = emptyTab ? <EmptyClinicalTab {...emptyTab} /> : null;
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
        genderOptions={patientGenderOptions}
        careProviders={patientCareProviders}
        pharmacies={patientPharmacies}
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
            insurancePolicies={insurancePolicies}
            appointmentGroups={appointmentGroups}
          />
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-none items-stretch border-b border-cf-border bg-cf-surface">
            <div className="min-w-0 flex-1 overflow-x-auto">
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
            <button
              type="button"
              onClick={onClose}
              className="mr-4 mt-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface text-cf-text-subtle shadow-sm transition hover:bg-cf-surface-muted hover:text-cf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25"
              aria-label="Close patient hub"
            >
              <X className="h-5 w-5" />
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
                  onConfirm: async () => {
                    if (editingPolicy.id) {
                      await deleteInsuranceMutation.mutateAsync(
                        editingPolicy.id
                      );
                    }
                  },
                })
            : undefined
        }
      />

      <AppointmentModal
        isOpen={appointmentFlow.modal.isOpen}
        mode={appointmentFlow.modal.mode as AppointmentMode}
        appointmentId={appointmentFlow.modal.editingId}
        formData={appointmentFlow.modal.formData}
        facilityId={selectedFacilityId}
        physicians={appointmentPhysicians}
        staffs={appointmentStaffs}
        resources={appointmentResources}
        statusOptions={appointmentStatusOptions}
        typeOptions={appointmentTypeOptions}
        error={appointmentError}
        onSubmit={handleSubmitAppointment}
        onClose={handleCloseAppointmentModal}
        onDelete={handleDeleteAppointment}
        onOpenHistory={handleOpenAppointmentHistory}
        selectedPatient={appointmentFlow.selectedPatient}
        onSelectPatient={appointmentFlow.setSelectedPatient}
        timeZone={facility?.timezone}
        onEditSessionBlocked={showEditBlockedDialog}
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
        onConfirm={confirmDialogState.onConfirm ?? undefined}
        onCancel={closeConfirmDialog}
      />

      <AppointmentEditBlockedDialog
        isOpen={editBlockedDialogState.isOpen}
        activeEditor={editBlockedDialogState.activeEditor}
        onClose={closeEditBlockedDialog}
      />
    </div>
  );

  return shell;
}
