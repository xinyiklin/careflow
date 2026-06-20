import { useMemo, useState, useCallback, useEffect } from "react";
import type { MouseEvent } from "react";

import ScheduleWorkspaceLayout from "../components/ScheduleWorkspaceLayout";
import SchedulePageOverlays from "./SchedulePageOverlays";
import SlotBeingBookedDialog from "../../appointments/components/SlotBeingBookedDialog";

import formatAppointments from "../../appointments/utils/formatAppointments";

import useAppointments from "../../appointments/hooks/useAppointments";
import useAppointmentMutations from "../../appointments/hooks/useAppointmentMutations";
import { useAppointmentFlowContext } from "../../appointments/AppointmentFlowProvider";
import {
  acquireSlotHold,
  beginAppointmentEditSession,
  releaseAppointmentEditSession,
} from "../../appointments/api/appointments";
import type { SlotHoldKey } from "../../appointments/api/appointments";
import useAppointmentSlotHold from "../../appointments/hooks/useAppointmentSlotHold";
import useSchedulePageColumns from "../hooks/useSchedulePageColumns";
import useFacility from "../../facilities/hooks/useFacility";
import useFacilityConfig from "../../facilities/hooks/useFacilityConfig";
import { usePatientFlowContext } from "../../patients/PatientFlowProvider";
import { Button, Notice } from "../../../shared/components/ui";
import WorkspaceShell from "../../../app/components/WorkspaceShell";
import { useUserPreferences } from "../../../app/context/UserPreferencesProvider";
import {
  SCHEDULE_QUICK_ACTION_EVENT,
  SCHEDULE_QUICK_ACTION_STORAGE_KEY,
} from "../../../shared/constants/quickActions";
import { getPatientChartName } from "../../patients/utils/patientDisplay";

import type { EntityId } from "../../../shared/api/types";
import type { ApiRecord, AppointmentLike } from "../../../shared/types/domain";
import type {
  AppointmentPatient,
  AppointmentResource,
  AppointmentStaff,
  AppointmentStatusOption,
  AppointmentSubmitPayload,
  AppointmentTypeOption,
} from "../../appointments/types";
import type {
  ScheduleConfirmDialogState,
  ScheduleContextMenuState,
  ScheduleEditBlockedDialogState,
  ScheduleFacilityOption,
  ScheduleHistoryModalState,
} from "../types";

export default function SchedulePage() {
  const { facility, selectedFacilityId } = useFacility();
  const { physicians, staffs, resources, statusOptions, typeOptions } =
    useFacilityConfig();
  const { openPatientSearch, patientFlow, recentPatients } =
    usePatientFlowContext();
  const { preferences, updatePreferences } = useUserPreferences();
  const scheduleResources = resources as ScheduleFacilityOption[];
  const appointmentPhysicians: AppointmentStaff[] = physicians;
  const appointmentStaffs: AppointmentStaff[] = staffs;
  const appointmentResources: AppointmentResource[] = resources;
  const appointmentStatusOptions: AppointmentStatusOption[] = statusOptions;
  const appointmentTypeOptions: AppointmentTypeOption[] = typeOptions;
  const appointmentRecentPatients =
    recentPatients as unknown as AppointmentPatient[];

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
  } = useSchedulePageColumns({
    facility,
    preferences,
    resources: scheduleResources,
  });

  const [confirmDialogState, setConfirmDialogState] =
    useState<ScheduleConfirmDialogState>({
      isOpen: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      onConfirm: null,
    });
  const [historyModalState, setHistoryModalState] =
    useState<ScheduleHistoryModalState>({
      isOpen: false,
      appointmentId: null,
      patientName: null,
      appointmentTime: null,
    });
  const [contextMenuState, setContextMenuState] =
    useState<ScheduleContextMenuState>({
      isOpen: false,
      x: 0,
      y: 0,
      appointment: null,
    });
  const [editBlockedDialogState, setEditBlockedDialogState] =
    useState<ScheduleEditBlockedDialogState>({
      isOpen: false,
      activeEditor: null,
      appointmentId: null,
    });
  // The empty slot currently held open by this user's create modal, kept alive
  // by useAppointmentSlotHold and released when the modal closes.
  const [activeSlotKey, setActiveSlotKey] = useState<SlotHoldKey | null>(null);
  const [slotBooking, setSlotBooking] = useState<{
    isOpen: boolean;
    name: string;
    slotKey: SlotHoldKey | null;
    slot: { date: string; time24: string; resourceId: EntityId | "" } | null;
    isOverriding: boolean;
  }>({
    isOpen: false,
    name: "",
    slotKey: null,
    slot: null,
    isOverriding: false,
  });

  const {
    appointments,
    error: appointmentsError,
    reload: reloadAppointments,
  } = useAppointments({
    facilityId: selectedFacilityId,
    date: queryDate,
    dateTo: lastVisibleDate,
  });

  const appointmentFlow = useAppointmentFlowContext();
  const { open: openAppointmentModal } = appointmentFlow.modal;

  useAppointmentSlotHold({
    facilityId: selectedFacilityId,
    slotKey: activeSlotKey,
  });

  // Release the slot hold whenever the create modal closes (save, cancel, or
  // escape) — the hold only represents an in-progress booking.
  const isAppointmentModalOpen = appointmentFlow.modal.isOpen;
  useEffect(() => {
    if (!isAppointmentModalOpen && activeSlotKey) {
      setActiveSlotKey(null);
    }
  }, [activeSlotKey, isAppointmentModalOpen]);

  const handleScheduleQuickAction = useCallback(
    (type: string | null | undefined) => {
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
        updatePreferences({
          scheduleViewMode: type === "view:slot" ? "slot" : "agenda",
        });
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
    const consumePendingAction = (type: string | null | undefined) => {
      if (!handleScheduleQuickAction(type)) return;
      sessionStorage.removeItem(SCHEDULE_QUICK_ACTION_STORAGE_KEY);
    };

    consumePendingAction(
      sessionStorage.getItem(SCHEDULE_QUICK_ACTION_STORAGE_KEY)
    );

    const handleWindowAction = (event: Event) => {
      const actionEvent = event as CustomEvent<{ type?: string }>;
      consumePendingAction(actionEvent.detail?.type);
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

  const openConfirmDialog = (
    opts: Omit<Partial<ScheduleConfirmDialogState>, "isOpen"> &
      Pick<ScheduleConfirmDialogState, "title" | "message">
  ) =>
    setConfirmDialogState({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || "Confirm",
      cancelText: opts.cancelText || "Cancel",
      variant: opts.variant || "default",
      onConfirm: opts.onConfirm || null,
    });
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

  const handleSubmitAppointment = async (
    submittedData: AppointmentSubmitPayload
  ) => {
    setAppError("");
    const buildPayload = (overrides: ApiRecord = {}) => ({
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
    const appointmentId = appointmentFlow.modal.editingId;
    if (!appointmentId) return;
    openConfirmDialog({
      title: "Delete Appointment",
      message:
        "Are you sure you want to delete this appointment? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteMutation.mutateAsync(appointmentId);
      },
    });
  };

  const handleDeleteAppointmentFromMenu = (appointment: AppointmentLike) => {
    const appointmentId = appointment?.id;
    if (!appointmentId) return;
    openConfirmDialog({
      title: "Delete Appointment",
      message:
        "Are you sure you want to delete this appointment? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteMutation.mutateAsync(appointmentId);
      },
    });
  };

  const handleOpenAppointmentHistory = (
    appointment: AppointmentLike | null = null
  ) => {
    if (!appointmentFlow.modal.editingId && !appointment?.id) return;
    setHistoryModalState({
      isOpen: true,
      appointmentId: appointment?.id || appointmentFlow.modal.editingId,
      patientName:
        (appointment
          ? getPatientChartName(appointment, appointment.patient_name || "")
          : getPatientChartName(appointmentFlow.selectedPatient, "")) || null,
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

  const openAppointmentContextMenu = (
    event: MouseEvent<HTMLDivElement>,
    appointment: AppointmentLike
  ) => {
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

  const closeEditBlockedDialog = useCallback(() => {
    setEditBlockedDialogState({
      isOpen: false,
      activeEditor: null,
      appointmentId: null,
    });
  }, []);

  const showEditBlockedDialog = useCallback(
    (
      activeEditor: ScheduleEditBlockedDialogState["activeEditor"],
      appointmentId: EntityId | null
    ) => {
      setEditBlockedDialogState({
        isOpen: true,
        activeEditor,
        appointmentId,
      });
    },
    []
  );

  const handleModalEditBlocked = useCallback(
    (activeEditor: ScheduleEditBlockedDialogState["activeEditor"]) => {
      showEditBlockedDialog(activeEditor, appointmentFlow.modal.editingId);
    },
    [appointmentFlow.modal.editingId, showEditBlockedDialog]
  );

  const handleTakeOverEdit = useCallback(
    (appointmentId: EntityId) => {
      closeEditBlockedDialog();
      const appointment = appointments.find(
        (candidate) => String(candidate.id) === String(appointmentId)
      );
      if (appointment) {
        openAppointmentModal({ mode: "edit", appointment });
      }
    },
    [appointments, closeEditBlockedDialog, openAppointmentModal]
  );

  const beginDropEditSession = useCallback(
    async (appointmentId: EntityId) => {
      try {
        const result = await beginAppointmentEditSession(
          selectedFacilityId,
          appointmentId
        );

        if (result?.status === "occupied") {
          showEditBlockedDialog(result.active_editor || null, appointmentId);
          return null;
        }

        return true;
      } catch {
        return false;
      }
    },
    [selectedFacilityId, showEditBlockedDialog]
  );

  useEffect(() => {
    if (!contextMenuState.isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAppointmentContextMenu();
      }
    };

    const handleScroll = (event: Event) => {
      // Scrolling the menu's own (status) list must not close it; only a
      // scroll of the schedule underneath should.
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-appointment-context-menu]")
      ) {
        return;
      }
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
    date: string,
    time24: string,
    dragged: AppointmentLike,
    nextResourceId?: EntityId | null
  ) => {
    const appointmentId = dragged?.id;
    if (!appointmentId) return;
    setAppError("");

    const shouldReleaseEditSession = await beginDropEditSession(appointmentId);
    if (shouldReleaseEditSession === null) return;

    const resourceId =
      nextResourceId !== undefined ? nextResourceId : dragged.resource || null;
    const buildPayload = (overrides: ApiRecord = {}) => ({
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
      await moveMutation.mutateAsync({
        id: appointmentId,
        data: buildPayload(),
      });
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
            id: appointmentId,
            data: buildPayload({ allow_same_day_double_book: true }),
          });
        },
      });
    } finally {
      if (shouldReleaseEditSession) {
        await releaseAppointmentEditSession(
          selectedFacilityId,
          appointmentId
        ).catch(() => {});
      }
    }
  };

  const handleChangeStatusFromMenu = async (
    appointment: AppointmentLike,
    statusId: EntityId
  ) => {
    const appointmentId = appointment?.id;
    if (!appointmentId) return;
    if (String(appointment.status ?? "") === String(statusId)) return;
    setAppError("");

    const selectedStatus = appointmentStatusOptions.find(
      (option) => String(option.id) === String(statusId)
    );

    const shouldReleaseEditSession = await beginDropEditSession(appointmentId);
    if (shouldReleaseEditSession === null) return;

    try {
      await moveMutation.mutateAsync({
        id: appointmentId,
        data: {
          patient: appointment.patient_id,
          resource: appointment.resource ?? null,
          rendering_provider: appointment.rendering_provider || null,
          appointment_time: appointment.appointment_time,
          room: appointment.room || "",
          reason: appointment.reason || "",
          notes: appointment.notes || "",
          status: statusId,
          appointment_type: appointment.appointment_type,
          facility: appointment.facility,
          // The block renders status_name/_color, but moveMutation's optimistic
          // merge only carries what we send. Include the chosen status's derived
          // fields so the label/color update immediately and stay correct even
          // if the follow-up refetch fails. These are read-only server-side, so
          // the PUT ignores them.
          status_name: selectedStatus?.name ?? null,
          status_code: selectedStatus?.code ?? null,
          status_color: selectedStatus?.color ?? null,
          // A status-only change keeps the same patient/date, so it can't
          // create a new same-day double booking. Bypass the duplicate-day
          // validator so an already double-booked appointment stays editable.
          allow_same_day_double_book: true,
        },
      });
    } catch {
      // moveMutation reverts its optimistic update and surfaces the error
      // message via setError; nothing extra to do here.
    } finally {
      if (shouldReleaseEditSession) {
        await releaseAppointmentEditSession(
          selectedFacilityId,
          appointmentId
        ).catch(() => {});
      }
    }
  };

  const handleOpenEdit = useCallback(
    async (appointment: AppointmentLike) => {
      if (!appointment?.id || !selectedFacilityId) return;

      closeAppointmentContextMenu();
      setAppError("");

      try {
        const result = await beginAppointmentEditSession(
          selectedFacilityId,
          appointment.id
        );

        if (result?.status === "occupied") {
          showEditBlockedDialog(
            result.active_editor || null,
            appointment.id ?? null
          );
          return;
        }

        openAppointmentModal({ mode: "edit", appointment });
      } catch {
        setAppError("Appointment could not be opened. Try again.");
      }
    },
    [
      closeAppointmentContextMenu,
      openAppointmentModal,
      selectedFacilityId,
      showEditBlockedDialog,
    ]
  );

  const handleOpenDuplicate = useCallback(
    (appointment: AppointmentLike) =>
      appointmentFlow.modal.openDuplicate(appointment),
    [appointmentFlow.modal]
  );

  const handleOpenPatientHub = useCallback(
    (appointment: AppointmentLike) => {
      if (!appointment?.patient_id) return;
      patientFlow.hub.openById(appointment.patient_id);
    },
    [patientFlow.hub]
  );

  const handleOpenFromSlot = async (
    date: string,
    time24: string,
    resourceId: EntityId | "" = ""
  ) => {
    const slotKey: SlotHoldKey = {
      startTime: `${date}T${time24}`,
      resource: resourceId === "" ? null : resourceId,
    };

    try {
      const result = await acquireSlotHold(selectedFacilityId, slotKey);
      if (result?.status === "occupied") {
        setSlotBooking({
          isOpen: true,
          name: result.active_user?.user_name || "Another user",
          slotKey,
          slot: { date, time24, resourceId },
          isOverriding: false,
        });
        return;
      }
    } catch {
      // Presence is advisory; fall through and open the modal anyway.
    }

    setActiveSlotKey(slotKey);
    appointmentFlow.modal.openFromSlot(date, time24, resourceId);
  };

  const closeSlotBooking = () =>
    setSlotBooking({
      isOpen: false,
      name: "",
      slotKey: null,
      slot: null,
      isOverriding: false,
    });

  const handleSlotBookingOverride = async () => {
    const { slotKey, slot } = slotBooking;
    if (!slotKey || !slot) return;

    setSlotBooking((current) => ({ ...current, isOverriding: true }));
    try {
      await acquireSlotHold(selectedFacilityId, slotKey, { override: true });
    } catch {
      // Advisory — proceed regardless.
    }

    setActiveSlotKey(slotKey);
    appointmentFlow.modal.openFromSlot(slot.date, slot.time24, slot.resourceId);
    closeSlotBooking();
  };

  const formattedAppointments = useMemo(
    () => formatAppointments(appointments, handleOpenEdit, facility?.timezone),
    [appointments, handleOpenEdit, facility?.timezone]
  );

  return (
    <>
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
                title="Couldn't load appointments"
                className="mb-4 shrink-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    The schedule may be out of date. Check your connection and
                    try again.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void reloadAppointments()}
                  >
                    Retry
                  </Button>
                </div>
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
            editBlockedDialogState={editBlockedDialogState}
            facility={facility}
            handleCloseAppointmentHistory={handleCloseAppointmentHistory}
            handleCloseAppointmentModal={handleCloseAppointmentModal}
            handleChangeStatusFromMenu={handleChangeStatusFromMenu}
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
            onCloseEditBlockedDialog={closeEditBlockedDialog}
            onEditSessionBlocked={handleModalEditBlocked}
            onTakeOverEdit={handleTakeOverEdit}
            onOpenPatientSearch={openPatientSearch}
            patientFlow={patientFlow}
            physicians={appointmentPhysicians}
            recentPatients={appointmentRecentPatients}
            resources={appointmentResources}
            selectedFacilityId={selectedFacilityId}
            staffs={appointmentStaffs}
            statusOptions={appointmentStatusOptions}
            typeOptions={appointmentTypeOptions}
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
      <SlotBeingBookedDialog
        isOpen={slotBooking.isOpen}
        name={slotBooking.name}
        isOverriding={slotBooking.isOverriding}
        onOverride={handleSlotBookingOverride}
        onCancel={closeSlotBooking}
      />
    </>
  );
}
