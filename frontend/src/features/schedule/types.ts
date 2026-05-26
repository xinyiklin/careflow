import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { ApiPayload, EntityId } from "../../shared/api/types";
import type { AppointmentBlockDisplay } from "../../shared/constants/appointmentBlockDisplay";
import type { TimeSlot } from "../../shared/utils/timeSlots";
import type { AppointmentEditSessionActiveEditor } from "../appointments/api/appointments";
import type {
  AppointmentFormData,
  AppointmentMode,
  AppointmentPatient,
  AppointmentResource,
  AppointmentStaff,
  AppointmentStatusOption,
  AppointmentSubmitPayload,
  AppointmentTypeOption,
} from "../appointments/types";
import type {
  ApiRecord,
  AppointmentLike,
  FacilityLike,
  ResourceDefinition,
  ScheduleViewMode,
} from "../../shared/types/domain";

export type ScheduleTimeSlot = TimeSlot & {
  isOutsideHours?: boolean;
  isBlocked?: boolean;
};

export type ScheduleMode = "resources" | "days";

export type ScheduleViewRouterProps = {
  viewMode: ScheduleViewMode;
} & Record<string, unknown>;

export type ScheduleDayEntry = {
  key: string;
  date: string;
  resourceKey: string;
  intervalMinutes: number;
  isOperatingDay: boolean;
};

export type ScheduleAppointment = AppointmentLike & {
  id?: EntityId;
  patient_name?: string | null;
  duration_minutes?: number | string | null;
  date?: string | null;
  time?: string | null;
  startSlot: number;
  span: number;
  endSlot: number;
  laneIndex: number;
  groupId: number;
  laneCount: number;
  onEdit?: () => void;
};

export type ScheduleDisplayAppointment = AppointmentLike & {
  onEdit?: () => void;
};

export type SchedulePreviewBlock = {
  appointment: AppointmentLike;
  laneIndex: number;
  laneCount: number;
  span: number;
  hoverDayKey?: string;
  hoverDate?: string;
  hoverTime24?: string | null;
  isPreview?: boolean;
};

export type ScheduleDragState = ScheduleDragData | null;

export type ScheduleDragData = {
  activated: boolean;
  appointment: AppointmentLike;
  originalDate?: string | null;
  originalTime?: string | null;
  originalResourceKey?: string;
  hoverDate?: string | null;
  hoverDayKey: string;
  hoverResourceKey: string;
  hoverTime24?: string | null;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
};

export type ScheduleAppointmentContextMenuHandler = (
  event: React.MouseEvent<HTMLDivElement>,
  appointment: AppointmentLike
) => void;

export type SchedulePointerDragStartHandler = (
  event: React.PointerEvent<HTMLDivElement>,
  appointment: AppointmentLike,
  dayKey: string,
  resourceKey: string
) => void;

export type ScheduleSlotDoubleClickHandler = (
  date: string,
  time24: string,
  resourceId: EntityId | ""
) => void;

export type ScheduleAppointmentDropHandler = (
  date: string,
  time24: string,
  appointment: AppointmentLike,
  nextResourceId?: EntityId | null
) => void | Promise<void>;

export type ScheduleViewProps = {
  appointments: ScheduleDisplayAppointment[];
  selectedDate: string;
  timeZone: string;
  facility?: FacilityLike | null;
  onDateChange?: (date: string) => void;
  onSlotDoubleClick?: ScheduleSlotDoubleClickHandler;
  onAppointmentDrop?: ScheduleAppointmentDropHandler;
  onAppointmentContextMenu?: ScheduleAppointmentContextMenuHandler;
  intervalMinutes?: number;
  visibleDayCount?: number;
  visibleDates?: string[];
  columnResourceKeys?: string[];
  columnIntervals?: number[];
  resourceOptions?: ResourceDefinition[];
  onVisibleDatesChange?: (dates: string[]) => void;
  onColumnResourceKeysChange?: (keys: string[]) => void;
  onColumnIntervalsChange?: (intervals: number[]) => void;
  onVisibleDayCountChange?: (count: number) => void;
  linkScroll?: boolean;
  sharedScrollTop?: number;
  onSharedScrollChange?: ((scrollTop: number) => void) | null;
  allowAddColumn?: boolean;
  sharedTimeRail?: boolean;
  scrollColumnsAt?: number | null;
  showIntervalSelector?: boolean;
  showResourceSelector?: boolean;
  resourceColumnMode?: boolean;
  showSlotDividers?: boolean;
  appointmentBlockDisplay: AppointmentBlockDisplay;
  showToolbar?: boolean;
  embedded?: boolean;
};

export type ScheduleGridCommonProps = {
  appointmentBlockDisplay: AppointmentBlockDisplay;
  appointmentsByColumn: Map<string, ScheduleAppointment[]>;
  dragState: ScheduleDragState;
  onAppointmentContextMenu?: ScheduleAppointmentContextMenuHandler;
  onPointerDragStart: SchedulePointerDragStartHandler;
  onSlotDoubleClick?: ScheduleSlotDoubleClickHandler;
  previewBlock?: SchedulePreviewBlock | null;
  registerDayScrollRef: (key: string, node: HTMLDivElement | null) => void;
  resourceOptionsByKey: Map<string, ResourceDefinition>;
  showSlotDividers: boolean;
  visibleDayCount: number;
  visibleDayEntries: ScheduleDayEntry[];
};

export type SharedScrollRef = MutableRefObject<boolean>;

export type ResourceLoadSummary = ResourceDefinition & {
  count: number;
  dotClassName: string;
};

export type ScheduleFormData = ApiPayload & {
  patient?: EntityId | "";
  resource?: EntityId | "";
  rendering_provider?: EntityId | "";
  appointment_time?: string;
  room?: string;
  reason?: string;
  notes?: string;
  status?: EntityId | "";
  appointment_type?: EntityId | "";
  facility?: EntityId | "";
};

export type ScheduleConfirmDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: "default" | "danger" | "warning";
  onConfirm: (() => void | Promise<void>) | null;
};

export type ScheduleHistoryModalState = {
  isOpen: boolean;
  appointmentId: EntityId | null;
  patientName: string | null;
  appointmentTime: string | null;
};

export type ScheduleContextMenuState = {
  isOpen: boolean;
  x: number;
  y: number;
  appointment: AppointmentLike | null;
};

export type ScheduleEditBlockedDialogState = {
  isOpen: boolean;
  activeEditor: AppointmentEditSessionActiveEditor;
};

export type ScheduleAppointmentFlow = {
  modal: {
    isOpen: boolean;
    mode: AppointmentMode | string;
    editingId: EntityId | null;
    formData: AppointmentFormData;
    close: () => void;
    open: (options: {
      mode: "create" | "edit" | "duplicate";
      appointment?: AppointmentLike | null;
      appointmentTime?: string | null;
      resourceId?: EntityId | "";
    }) => void;
    openDuplicate: (appointment: AppointmentLike) => void;
    openFromSlot: (
      date: string,
      time24: string,
      resourceId?: EntityId | ""
    ) => void;
  };
  selectedPatient: AppointmentLike | null;
  setSelectedPatient: Dispatch<SetStateAction<AppointmentLike | null>>;
};

export type SchedulePatientFlow = {
  hub: {
    openById: (patientId: EntityId) => void;
  };
  modal: {
    open: (options: { mode: "create"; source: string }) => void;
  };
};

export type ScheduleOpenPatientSearch = (
  source: string,
  options: {
    onSelectPatient: Dispatch<SetStateAction<AppointmentLike | null>>;
  }
) => void;

export type ScheduleFacilityOption = ApiRecord & {
  id?: EntityId;
  is_active?: boolean;
  can_render_claims?: boolean;
  linked_staff?: EntityId | null;
  default_room?: string | null;
};

export type ScheduleWorkspaceLayoutProps = {
  facilityId?: EntityId | null;
  facility?: FacilityLike | null;
  selectedDate: string;
  scheduleMode: ScheduleMode;
  viewMode: ScheduleViewMode;
  showSlotDividers: boolean;
  appointmentBlockDisplay: AppointmentBlockDisplay;
  activeScheduleInterval: number;
  formattedAppointments: ScheduleDisplayAppointment[];
  resourceDefinitions: ResourceDefinition[];
  activeColumnResourceKeys: string[];
  effectiveVisibleDates: string[];
  visibleColumnIntervals: number[];
  visibleDayCount: number;
  onSelectDate: (date: string) => void;
  onJumpToToday: () => void;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  onScheduleIntervalChange: (interval: number) => void;
  onToggleResource: (resourceKey: string) => void;
  onVisibleDatesChange: (dates: string[]) => void;
  onColumnResourceKeysChange: (keys: string[]) => void;
  onVisibleDayCountChange: (count: number) => void;
  onSlotDoubleClick: ScheduleSlotDoubleClickHandler;
  onAppointmentDrop: ScheduleAppointmentDropHandler;
  onAppointmentContextMenu: ScheduleAppointmentContextMenuHandler;
  onColumnIntervalsChange: (intervals: number[]) => void;
};

export type ScheduleSidebarProps = {
  facilityId?: EntityId | null;
  facility?: FacilityLike | null;
  selectedDate: string;
  scheduleMode: ScheduleMode;
  activeScheduleInterval: number;
  resourceLoadSummaries: ResourceLoadSummary[];
  selectedResourceKeySet: Set<string>;
  onJumpToToday: () => void;
  onSelectDate: (date: string) => void;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  onScheduleIntervalChange: (interval: number) => void;
  onToggleResource: (resourceKey: string) => void;
};

export type ScheduleHeaderProps = {
  facility?: FacilityLike | null;
  scheduleMode: ScheduleMode;
  activeScheduleInterval: number;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  onScheduleIntervalChange: (interval: number) => void;
};

export type SchedulePageOverlaysProps = {
  appError: string;
  appointmentFlow: ScheduleAppointmentFlow;
  confirmDialogState: ScheduleConfirmDialogState;
  contextMenuState: ScheduleContextMenuState;
  editBlockedDialogState: ScheduleEditBlockedDialogState;
  facility?: FacilityLike | null;
  handleCloseAppointmentHistory: () => void;
  handleCloseAppointmentModal: () => void;
  handleConfirmDialogConfirm: () => void | Promise<void>;
  handleDeleteAppointment: () => void;
  handleDeleteAppointmentFromMenu: (appointment: AppointmentLike) => void;
  handleOpenAppointmentHistory: (appointment?: AppointmentLike | null) => void;
  handleOpenDuplicate: (appointment: AppointmentLike) => void;
  handleOpenEdit: (appointment: AppointmentLike) => void | Promise<void>;
  handleOpenPatientHub: (appointment: AppointmentLike) => void;
  handleSubmitAppointment: ScheduleAppointmentSubmitHandler;
  historyModalState: ScheduleHistoryModalState;
  onCloseAppointmentContextMenu: () => void;
  onCloseConfirmDialog: () => void;
  onCloseEditBlockedDialog: () => void;
  onEditSessionBlocked: (
    activeEditor: AppointmentEditSessionActiveEditor
  ) => void;
  onOpenPatientSearch: ScheduleOpenPatientSearch;
  patientFlow: SchedulePatientFlow;
  physicians: AppointmentStaff[];
  recentPatients: AppointmentPatient[];
  resources: AppointmentResource[];
  selectedFacilityId?: EntityId | null;
  staffs: AppointmentStaff[];
  statusOptions: AppointmentStatusOption[];
  typeOptions: AppointmentTypeOption[];
};

export type ScheduleAppointmentSubmitHandler = (
  submittedData: AppointmentSubmitPayload
) => Promise<void>;
