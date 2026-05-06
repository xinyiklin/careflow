import type { MutableRefObject } from "react";

import type { EntityId } from "../../shared/api/types";
import type { AppointmentBlockDisplay } from "../../shared/constants/appointmentBlockDisplay";
import type {
  AppointmentLike,
  ResourceDefinition,
  ScheduleViewMode,
} from "../../shared/types/domain";

export type ScheduleTimeSlot = {
  value: string;
  time24: string;
};

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
  id: EntityId;
  startSlot: number;
  span: number;
  endSlot: number;
  laneIndex: number;
  groupId: number;
  laneCount: number;
  onEdit?: () => void;
};

export type SchedulePreviewBlock = ScheduleAppointment & {
  appointment: ScheduleAppointment;
  hoverDayKey?: string;
  hoverDate?: string;
  hoverTime24?: string;
  isPreview?: boolean;
};

export type ScheduleDragState =
  | {
      activated: true;
      appointment: ScheduleAppointment;
      pointerX: number;
      pointerY: number;
    }
  | {
      activated?: false;
      appointment?: ScheduleAppointment;
      pointerX?: number;
      pointerY?: number;
    }
  | null;

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
