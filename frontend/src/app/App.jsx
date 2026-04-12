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

import AppNavbar from "../shared/components/AppNavbar"
import AppSidebar from "../shared/components/AppSidebar";

function App() {
  const queryClient = useQueryClient();

  const [appError, setAppError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("accessToken")
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    queryClient.clear();
    setIsAuthenticated(false);
    setAppError("");
  };

  const {
    facility,
    currentUser,
    role,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser(isAuthenticated);

  const {
    physicians,
    statusOptions,
    typeOptions,
    genderOptions,
  } = useFacilityConfig(isAuthenticated, facility?.id);

  const {
    appointments
  } = useAppointments(isAuthenticated, facility?.id, selectedDate);

  const appointmentFlow = useAppointmentFlow({
    facility,
    physicians,
    statusOptions,
    typeOptions,
    selectedDate,
  });

  const patientFlow = usePatientFlow();

  const {
    createMutation,
    updateMutation,
    deleteMutation,
    moveMutation,
  } = useAppointmentMutations({
    onCloseModal: appointmentFlow.closeModal,
    onMoveSuccess: () => appointmentFlow.setDraggedAppointment(null),
    setError: setAppError,
  });

  const handleSubmitAppointment = (submittedData) => {
    const payload = {
      ...submittedData,
      patient: appointmentFlow.selectedPatient?.id || "",
      status: submittedData.status ? Number(submittedData.status) : "",
      appointment_type: submittedData.appointment_type
        ? Number(submittedData.appointment_type)
        : "",
      facility: submittedData.facility ? Number(submittedData.facility) : "",
    };

    if (appointmentFlow.editingId) {
      updateMutation.mutate({ id: appointmentFlow.editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteAppointment = () => {
    if (!appointmentFlow.editingId) return;

    if (!window.confirm("Are you sure you want to delete this appointment?")) {
      return;
    }

    deleteMutation.mutate(appointmentFlow.editingId);
  };

  const handleDropAppointment = (date, time24) => {
    const dragged = appointmentFlow.draggedAppointment;
    if (!dragged) return;

    const payload = {
      patient: dragged.patient_id,
      doctor_name: dragged.doctor_name,
      appointment_time: `${date}T${time24}`,
      reason: dragged.reason || "",
      status: dragged.status,
      appointment_type: dragged.appointment_type,
      facility: dragged.facility,
    };

    moveMutation.mutate({
      id: dragged.id,
      data: payload,
    });
  };

  const formattedAppointments = useMemo(
    () => formatAppointments(appointments, appointmentFlow.openEditModal),
    [appointments]
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
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenPatientSearch={() => {
          patientFlow.setIsPatientSearchOpen(true);
          setIsSidebarOpen(false);
        }}
      />

      <div
        className={[
          "flex flex-1 flex-col transition-all duration-200",
          isSidebarOpen ? "lg:ml-64" : "lg:ml-0",
        ].join(" ")}
      >
        <AppNavbar
          fullName={currentUser?.full_name || currentUser?.username || "User"}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6">
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
              onAppointmentDragStart={appointmentFlow.setDraggedAppointment}
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
              onClose={appointmentFlow.closeModal}
              onDelete={handleDeleteAppointment}
              selectedPatient={appointmentFlow.selectedPatient}
              onSelectPatient={appointmentFlow.setSelectedPatient}
              onOpenDetailedSearch={() => patientFlow.setIsPatientSearchOpen(true)}
              onOpenCreatePatient={patientFlow.openCreatePatient}
            />

            <PatientSearchModal
              isOpen={patientFlow.isPatientSearchOpen}
              onClose={() => patientFlow.setIsPatientSearchOpen(false)}
              onSelectPatient={(patient) => {
                appointmentFlow.setSelectedPatient(patient);
                patientFlow.setIsPatientSearchOpen(false);
              }}
              onOpenCreatePatient={patientFlow.openCreatePatient}
              onOpenPatientProfile={patientFlow.openEditPatient}
              allowSelect={!appointmentFlow.editingId}
              refreshKey={patientFlow.patientSearchRefreshKey}
              injectedPatient={patientFlow.patientSearchInjectedPatient}
            />

            <PatientDetailModal
              isOpen={patientFlow.isPatientDetailOpen}
              mode={patientFlow.patientDetailMode}
              patient={patientFlow.activePatient}
              genderOptions={genderOptions}
              onClose={() => patientFlow.setIsPatientDetailOpen(false)}
              onSaved={(savedPatient) =>
                patientFlow.handlePatientSaved(
                  savedPatient,
                  appointmentFlow.setSelectedPatient
                )
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;