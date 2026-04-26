import { useMemo, useState, useCallback, useEffect } from "react";

import ScheduleWorkspaceLayout from "../components/ScheduleWorkspaceLayout";
import SchedulePageOverlays from "./SchedulePageOverlays";

import formatAppointments from "../../appointments/utils/formatAppointments";

import useAppointments from "../../appointments/hooks/useAppointments";
import useAppointmentMutations from "../../appointments/hooks/useAppointmentMutations";
import useAppointmentFlow from "../../appointments/hooks/useAppointmentFlow";
import useSchedulePageColumns from "../hooks/useSchedulePageColumns";
import useFacility from "../../facilities/hooks/useFacility";
import useFacilityConfig from "../../facilities/hooks/useFacilityConfig";
import { usePatientFlowContext } from "../../patients/PatientFlowProvider";
import { Notice } from "../../../shared/components/ui";
import WorkspaceShell from "../../../shared/components/WorkspaceShell";
import { useBootReadiness } from "../../../app/BootReadinessContext";
import { useUserPreferences } from "../../../shared/context/UserPreferencesProvider";
import {
  SCHEDULE_QUICK_ACTION_EVENT,
  SCHEDULE_QUICK_ACTION_STORAGE_KEY,
} from "../../../shared/constants/quickActions";

export default function SchedulePage() {
  const { facility, selectedFacilityId } = useFacility();
  const { physicians, staffs, resources, statusOptions, typeOptions } =
    useFacilityConfig();
  const { openPatientSearch, patientFlow, recentPatients } =
    usePatientFlowContext();
  const { setRouteReady } = useBootReadiness();
  const { preferences, updatePreferences } = useUserPreferences();

  const [appError, setAppError] = useState("");
  const viewMode = preferences.scheduleViewMode;
  const showSlotDividers = preferences.showScheduleSlotDividers;
  const {
    activeColumnResourceKeys,
    activeScheduleInterval,
    effectiveVisibleDates,
    handleColumnResourceKeysChange,
    handleJumpToToday,
    handleQuickActionToday,
    handleScheduleIntervalChange,
    handleScheduleModeChange,
    handleSelectScheduleDate,
    handleToggleScheduleResource,
    handleVisibleDatesChange,
    lastVisibleDate,
    multiDayResourceKey,
    queryDate,
    resourceDefinitions,
    scheduleMode,
    selectedDate,
    setActiveVisibleDayCount,
    setVisibleColumnIntervals,
    visibleColumnIntervals,
    visibleColumnResourceKeys,
    visibleDayCount,
  } = useSchedulePageColumns({ facility, preferences, resources });

  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
    onConfirm: null,
  });
  const [historyModalState, setHistoryModalState] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: null,
    appointmentTime: null,
  });
  const [contextMenuState, setContextMenuState] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    appointment: null,
  });

  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointments({
    facilityId: selectedFacilityId,
    date: queryDate,
    dateTo: lastVisibleDate,
  });

  useEffect(() => {
    if (!selectedFacilityId || !selectedDate || !queryDate) return;
    if (appointmentsLoading) return;
    setRouteReady(true);
  }, [
    appointmentsLoading,
    queryDate,
    selectedDate,
    selectedFacilityId,
    setRouteReady,
  ]);
  const appointmentFlow = useAppointmentFlow({
    facility,
    physicians,
    staffs,
    resources,
    statusOptions,
    typeOptions,
    selectedDate,
  });
  const { open: openAppointmentModal } = appointmentFlow.modal;

  const handleScheduleQuickAction = useCallback(
    (type) => {
      if (!type) return false;

      if (type === "new-appointment") {
        if (!selectedDate) return false;
        openAppointmentModal({
          mode: "create",
          resourceId:
            scheduleMode === "days"
              ? multiDayResourceKey || visibleColumnResourceKeys[0] || ""
              : visibleColumnResourceKeys[0] || "",
        });
        return true;
      }

      if (type === "today") {
        return handleQuickActionToday();
      }

      if (type === "view:slot" || type === "view:agenda") {
        updatePreferences({ scheduleViewMode: type.replace("view:", "") });
        return true;
      }

      return false;
    },
    [
      handleQuickActionToday,
      multiDayResourceKey,
      openAppointmentModal,
      scheduleMode,
      selectedDate,
      updatePreferences,
      visibleColumnResourceKeys,
    ]
  );

  useEffect(() => {
    const consumePendingAction = (type) => {
      if (!handleScheduleQuickAction(type)) return;
      sessionStorage.removeItem(SCHEDULE_QUICK_ACTION_STORAGE_KEY);
    };

    consumePendingAction(
      sessionStorage.getItem(SCHEDULE_QUICK_ACTION_STORAGE_KEY)
    );

    const handleWindowAction = (event) => {
      consumePendingAction(event.detail?.type);
    };

    window.addEventListener(SCHEDULE_QUICK_ACTION_EVENT, handleWindowAction);
    return () =>
      window.removeEventListener(
        SCHEDULE_QUICK_ACTION_EVENT,
        handleWindowAction
      );
  }, [handleScheduleQuickAction]);

  const handleCloseAppointmentModal = () => {
    setAppError("");
    closeConfirmDialog();
    closeAppointmentContextMenu();
    appointmentFlow.modal.close();
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

  const openConfirmDialog = (opts) =>
    setConfirmDialogState({ isOpen: true, ...opts });
  const closeConfirmDialog = () =>
    setConfirmDialogState({
      isOpen: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      onConfirm: null,
    });
  const handleConfirmDialogConfirm = async () => {
    if (!confirmDialogState.onConfirm) return;
    await confirmDialogState.onConfirm();
    closeConfirmDialog();
  };

  const handleSubmitAppointment = async (submittedData) => {
    setAppError("");
    const buildPayload = (overrides = {}) => ({
      ...submittedData,
      patient: appointmentFlow.selectedPatient?.id || "",
      resource: submittedData.resource ? Number(submittedData.resource) : null,
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
      await saveMutation.mutateAsync({
        id: appointmentFlow.modal.editingId,
        data: buildPayload(),
      });
    } catch (err) {
      const duplicateError = getDuplicateDayAppointmentError(err);
      if (!duplicateError) return;
      setAppError("");
      openConfirmDialog({
        title: "Possible Double Booking",
        message:
          "This patient already has an appointment on this date. Creating another appointment may result in a double booking. Do you want to proceed anyway?",
        confirmText: "Confirm",
        variant: "warning",
        onConfirm: async () => {
          await saveMutation.mutateAsync({
            id: appointmentFlow.modal.editingId,
            data: buildPayload({ allow_same_day_double_book: true }),
          });
        },
      });
    }
  };

  const handleDeleteAppointment = () => {
    if (!appointmentFlow.modal.editingId) return;
    openConfirmDialog({
      title: "Delete Appointment",
      message:
        "Are you sure you want to delete this appointment? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteMutation.mutateAsync(appointmentFlow.modal.editingId);
      },
    });
  };

  const handleDeleteAppointmentFromMenu = (appointment) => {
    if (!appointment?.id) return;
    openConfirmDialog({
      title: "Delete Appointment",
      message:
        "Are you sure you want to delete this appointment? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteMutation.mutateAsync(appointment.id);
      },
    });
  };

  const handleOpenAppointmentHistory = (appointment = null) => {
    if (!appointmentFlow.modal.editingId && !appointment?.id) return;
    setHistoryModalState({
      isOpen: true,
      appointmentId: appointment?.id || appointmentFlow.modal.editingId,
      patientName:
        appointment?.patient_name ||
        appointmentFlow.selectedPatient?.display_name ||
        appointmentFlow.selectedPatient?.full_name ||
        appointmentFlow.selectedPatient?.patient_name ||
        null,
      appointmentTime:
        appointment?.appointment_time ||
        appointmentFlow.modal.formData.appointment_time,
    });
  };

  const handleCloseAppointmentHistory = () => {
    setHistoryModalState({
      isOpen: false,
      appointmentId: null,
      patientName: null,
      appointmentTime: null,
    });
  };

  const openAppointmentContextMenu = (event, appointment) => {
    setContextMenuState({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      appointment,
    });
  };

  const closeAppointmentContextMenu = useCallback(() => {
    setContextMenuState({
      isOpen: false,
      x: 0,
      y: 0,
      appointment: null,
    });
  }, []);

  useEffect(() => {
    if (!contextMenuState.isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeAppointmentContextMenu();
      }
    };

    const handleScroll = () => {
      closeAppointmentContextMenu();
    };

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [closeAppointmentContextMenu, contextMenuState.isOpen]);

  const handleDropAppointment = async (
    date,
    time24,
    dragged,
    nextResourceId
  ) => {
    if (!dragged) return;
    const resourceId =
      nextResourceId !== undefined ? nextResourceId : dragged.resource || null;
    const buildPayload = (overrides = {}) => ({
      patient: dragged.patient_id,
      resource: resourceId,
      rendering_provider: dragged.rendering_provider || null,
      appointment_time: `${date}T${time24}`,
      room: dragged.room || "",
      reason: dragged.reason || "",
      notes: dragged.notes || "",
      status: dragged.status,
      appointment_type: dragged.appointment_type,
      facility: dragged.facility,
      ...overrides,
    });

    try {
      await moveMutation.mutateAsync({ id: dragged.id, data: buildPayload() });
    } catch (err) {
      const duplicateError = getDuplicateDayAppointmentError(err);
      if (!duplicateError) return;
      setAppError("");
      openConfirmDialog({
        title: "Possible Double Booking",
        message:
          "This patient already has an appointment on this date. Moving this appointment may result in a double booking. Do you want to proceed anyway?",
        confirmText: "Confirm",
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

  const handleOpenEdit = useCallback(
    (appointment) => openAppointmentModal({ mode: "edit", appointment }),
    [openAppointmentModal]
  );

  const handleOpenDuplicate = useCallback(
    (appointment) => appointmentFlow.modal.openDuplicate(appointment),
    [appointmentFlow.modal]
  );

  const handleOpenPatientHub = useCallback(
    (appointment) => {
      if (!appointment?.patient_id) return;
      patientFlow.hub.openById(appointment.patient_id);
    },
    [patientFlow.hub]
  );

  const handleOpenFromSlot = useCallback(
    (date, time24, resourceId = "") =>
      appointmentFlow.modal.openFromSlot(date, time24, resourceId),
    [appointmentFlow.modal]
  );

  const formattedAppointments = useMemo(
    () => formatAppointments(appointments, handleOpenEdit, facility?.timezone),
    [appointments, handleOpenEdit, facility?.timezone]
  );

  return (
    <WorkspaceShell
      beforePanel={
        <>
          {appError && !appointmentFlow.modal.isOpen ? (
            <Notice tone="danger" className="mb-4 shrink-0">
              {appError}
            </Notice>
          ) : null}

          {appointmentsError ? (
            <Notice
              tone="danger"
              title="Appointments could not be loaded"
              className="mb-4 shrink-0"
            >
              Failed to load appointments. {appointmentsError}
            </Notice>
          ) : null}
        </>
      }
      afterPanel={
        <SchedulePageOverlays
          appError={appError}
          appointmentFlow={appointmentFlow}
          confirmDialogState={confirmDialogState}
          contextMenuState={contextMenuState}
          facility={facility}
          handleCloseAppointmentHistory={handleCloseAppointmentHistory}
          handleCloseAppointmentModal={handleCloseAppointmentModal}
          handleConfirmDialogConfirm={handleConfirmDialogConfirm}
          handleDeleteAppointment={handleDeleteAppointment}
          handleDeleteAppointmentFromMenu={handleDeleteAppointmentFromMenu}
          handleOpenAppointmentHistory={handleOpenAppointmentHistory}
          handleOpenDuplicate={handleOpenDuplicate}
          handleOpenEdit={handleOpenEdit}
          handleOpenPatientHub={handleOpenPatientHub}
          handleSubmitAppointment={handleSubmitAppointment}
          historyModalState={historyModalState}
          onCloseAppointmentContextMenu={closeAppointmentContextMenu}
          onCloseConfirmDialog={closeConfirmDialog}
          onOpenPatientSearch={openPatientSearch}
          patientFlow={patientFlow}
          physicians={physicians}
          recentPatients={recentPatients}
          resources={resources}
          selectedFacilityId={selectedFacilityId}
          staffs={staffs}
          statusOptions={statusOptions}
          typeOptions={typeOptions}
        />
      }
    >
      <ScheduleWorkspaceLayout
        facilityId={selectedFacilityId}
        facility={facility}
        selectedDate={selectedDate}
        scheduleMode={scheduleMode}
        viewMode={viewMode}
        showSlotDividers={showSlotDividers}
        appointmentBlockDisplay={preferences.appointmentBlockDisplay}
        activeScheduleInterval={activeScheduleInterval}
        formattedAppointments={formattedAppointments}
        resourceDefinitions={resourceDefinitions}
        activeColumnResourceKeys={activeColumnResourceKeys}
        effectiveVisibleDates={effectiveVisibleDates}
        visibleColumnIntervals={visibleColumnIntervals}
        visibleDayCount={visibleDayCount}
        onSelectDate={handleSelectScheduleDate}
        onJumpToToday={handleJumpToToday}
        onScheduleModeChange={handleScheduleModeChange}
        onScheduleIntervalChange={handleScheduleIntervalChange}
        onToggleResource={handleToggleScheduleResource}
        onVisibleDatesChange={handleVisibleDatesChange}
        onColumnResourceKeysChange={handleColumnResourceKeysChange}
        onVisibleDayCountChange={setActiveVisibleDayCount}
        onSlotDoubleClick={handleOpenFromSlot}
        onAppointmentDrop={handleDropAppointment}
        onAppointmentContextMenu={openAppointmentContextMenu}
        onColumnIntervalsChange={setVisibleColumnIntervals}
      />
    </WorkspaceShell>
  );
}
