import "../App.css";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { login } from "../features/auth/api/accounts";

import LoginForm from "../shared/components/LoginForm";
import SchedulerDayView from "../features/appointments/components/SchedulerDayView";
import AppointmentFormModal from "../features/appointments/components/AppointmentFormModal";
import PatientSearchModal from "../features/patients/components/PatientSearchModal";
import PatientDetailModal from "../features/patients/components/PatientDetailModal";

import { getTodayLocal } from "../shared/utils/dateTime";
import formatAppointments from "../features/appointments/utils/formatAppointments";

import useCurrentUser from "../features/facility/hooks/useCurrentUser";
import useFacilityConfig from "../features/facility/hooks/useFacilityConfig";
import useAppointments from "../features/appointments/hooks/useAppointments";
import useAppointmentMutations from "../features/appointments/hooks/useAppointmentMutations";
import useAppointmentFlow from "../features/appointments/hooks/useAppointmentFlow";
import usePatientFlow from "../features/patients/hooks/usePatientFlow";

import AppNavbar from "../shared/components/AppNavbar";
import AppSidebar from "../shared/components/AppSidebar";

import ConfirmDialog from "../shared/components/ConfirmDialog";

function App() {
  const queryClient = useQueryClient();

  const [appError, setAppError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("accessToken")
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
    onConfirm: null,
  });

  const handleLoginSubmit = async (credentials) => {
    setAuthLoading(true);
    setAuthError("");

    try {
      const data = await login(credentials);
      localStorage.setItem("accessToken", data.access);
      localStorage.setItem("refreshToken", data.refresh);
      setIsAuthenticated(true);
      setAppError("");
    } catch (err) {
      console.error(err);
      setAuthError("Invalid username or password.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("recentPatients");
    queryClient.clear();
    setIsAuthenticated(false);
    setAppError("");
  };

  const {
    facility,
    currentUser,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser(isAuthenticated);

  const { physicians, statusOptions, typeOptions, genderOptions } =
    useFacilityConfig(isAuthenticated, facility?.id);

  const { appointments } = useAppointments(
    isAuthenticated,
    facility?.id,
    selectedDate
  );

  const appointmentFlow = useAppointmentFlow({
    facility,
    physicians,
    statusOptions,
    typeOptions,
    selectedDate,
  });

  const patientFlow = usePatientFlow();

  const handleCloseAppointmentModal = () => {
    setAppError("");
    closeConfirmDialog();
    appointmentFlow.closeModal();
  };

  const openConfirmDialog = ({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
    onConfirm,
  }) => {
    setConfirmDialogState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      variant,
      onConfirm,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialogState({
      isOpen: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      onConfirm: null,
    });
  };

  const handleConfirmDialogConfirm = async () => {
    if (!confirmDialogState.onConfirm) return;

    await confirmDialogState.onConfirm();
    closeConfirmDialog();
  };

  const {
    deleteMutation,
    saveMutation,
    moveMutation,
    getDuplicateDayAppointmentError,
  } = useAppointmentMutations({
    onCloseModal: handleCloseAppointmentModal,
    setError: setAppError,
  });

  const handleSubmitAppointment = async (submittedData) => {
    setAppError("");

    // Helper to ensure payload consistency across both initial save and double-booking override
    const buildPayload = (overrides = {}) => ({
      ...submittedData,
      patient: appointmentFlow.selectedPatient?.id || "",
      status: submittedData.status ? Number(submittedData.status) : "",
      appointment_type: submittedData.appointment_type
        ? Number(submittedData.appointment_type)
        : "",
      facility: submittedData.facility ? Number(submittedData.facility) : "",
      ...overrides,
    });

    const payload = buildPayload();

    try {
      // ONE call to saveMutation handles both Create and Update
      await saveMutation.mutateAsync({
        id: appointmentFlow.editingId, // Will be undefined/null for 'create'
        data: payload,
      });
    } catch (err) {
      const duplicateError = getDuplicateDayAppointmentError(err);
      if (!duplicateError) return;

      // Standard Double Booking flow
      openConfirmDialog({
        title: "Possible Double Booking",
        message:
          "This patient already has an appointment on this date. Creating another appointment may result in a double booking. Do you want to proceed anyway?",
        confirmText: "Confirm",
        variant: "warning",
        onConfirm: async () => {
          const overridePayload = buildPayload({
            allow_same_day_double_book: true,
          });

          await saveMutation.mutateAsync({
            id: appointmentFlow.editingId,
            data: overridePayload,
          });
        },
      });
    }
  };

  const handleDeleteAppointment = () => {
    if (!appointmentFlow.editingId) return;

    openConfirmDialog({
      title: "Delete Appointment",
      message:
        "Are you sure you want to delete this appointment? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteMutation.mutateAsync(appointmentFlow.editingId);
      },
    });
  };

  const handleDropAppointment = async (date, time24, dragged) => {
    if (!dragged) return;

    const buildPayload = (overrides = {}) => ({
      patient: dragged.patient_id,
      doctor_name: dragged.doctor_name,
      appointment_time: `${date}T${time24}`,
      reason: dragged.reason || "",
      status: dragged.status,
      appointment_type: dragged.appointment_type,
      facility: dragged.facility,
      ...overrides,
    });

    const payload = buildPayload();

    try {
      await moveMutation.mutateAsync({
        id: dragged.id,
        data: payload,
      });
    } catch (err) {
      const duplicateError = getDuplicateDayAppointmentError(err);

      if (!duplicateError) {
        return;
      }

      openConfirmDialog({
        title: "Possible Double Booking",
        message:
          "This patient already has an appointment on this date. Moving this appointment may result in a double booking. Do you want to proceed anyway?",
        confirmText: "Proceed Anyway",
        cancelText: "Cancel",
        variant: "warning",
        onConfirm: async () => {
          await moveMutation.mutateAsync({
            id: dragged.id,
            data: buildPayload({ allow_same_day_double_book: true }),
          });
        },
      });
    }
  };

  const formattedAppointments = useMemo(
    () => formatAppointments(appointments, appointmentFlow.openEditModal),
    [appointments, appointmentFlow.openEditModal]
  );

  if (!isAuthenticated) {
    return (
      <LoginForm
        onSubmit={handleLoginSubmit}
        error={authError}
        loading={authLoading}
      />
    );
  }

  if (userLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  if (userError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load user info.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-0px)] bg-slate-50">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <div
        className={[
          "flex flex-1 flex-col transition-all duration-200",
          isSidebarCollapsed ? "ml-16" : "ml-36",
        ].join(" ")}
      >
        <AppNavbar
          fullName={currentUser?.full_name || currentUser?.username || "User"}
          onLogout={handleLogout}
          onOpenPatientSearch={() => {
            patientFlow.openPatientSearch("navbar");
          }}
          recentPatients={patientFlow.recentPatients}
          onOpenRecentPatient={(patient) => {
            patientFlow.openPatientFromHistory(patient);
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4">
            {appError && !appointmentFlow.isModalOpen && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {appError}
              </div>
            )}

            <SchedulerDayView
              appointments={formattedAppointments}
              intervalMinutes={15}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSlotDoubleClick={appointmentFlow.openCreateFromSlot}
              onAppointmentDrop={handleDropAppointment}
            />

            <AppointmentFormModal
              isOpen={appointmentFlow.isModalOpen}
              mode={appointmentFlow.editingId ? "edit" : "create"}
              formData={appointmentFlow.formData}
              physicians={physicians}
              statusOptions={statusOptions}
              typeOptions={typeOptions}
              error={appError}
              onSubmit={handleSubmitAppointment}
              onClose={handleCloseAppointmentModal}
              onDelete={handleDeleteAppointment}
              selectedPatient={appointmentFlow.selectedPatient}
              onSelectPatient={appointmentFlow.setSelectedPatient}
              onOpenDetailedSearch={() => {
                patientFlow.openPatientSearch("appointment");
              }}
              onOpenCreatePatient={patientFlow.openCreatePatient}
            />

            <PatientSearchModal
              isOpen={patientFlow.isPatientSearchOpen}
              onClose={patientFlow.closePatientSearch}
              onSelectPatient={(patient) => {
                appointmentFlow.setSelectedPatient(patient);
                patientFlow.closePatientSearch();
              }}
              onOpenCreatePatient={patientFlow.openCreatePatient}
              onOpenPatientProfile={(patient) => {
                patientFlow.addRecentPatient(patient);
                patientFlow.openEditPatient(patient);
              }}
              allowSelect={patientFlow.patientSearchSource === "appointment"}
              injectedPatient={patientFlow.patientSearchInjectedPatient}
              injectedPatientMode={patientFlow.patientDetailMode}
            />

            <PatientDetailModal
              isOpen={patientFlow.isPatientDetailOpen}
              mode={patientFlow.patientDetailMode}
              patient={patientFlow.activePatient}
              genderOptions={genderOptions}
              onClose={patientFlow.closePatientDetail}
              onSaved={(savedPatient) =>
                patientFlow.handlePatientSaved(
                  savedPatient,
                  appointmentFlow.setSelectedPatient
                )
              }
            />

            <ConfirmDialog
              isOpen={confirmDialogState.isOpen}
              title={confirmDialogState.title}
              message={confirmDialogState.message}
              confirmText={confirmDialogState.confirmText}
              cancelText={confirmDialogState.cancelText}
              variant={confirmDialogState.variant}
              onConfirm={handleConfirmDialogConfirm}
              onCancel={closeConfirmDialog}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
