import AppointmentBlock from "../../appointments/components/AppointmentBlock";
import { getRenderedSpan } from "../utils/scheduleGridMath";

import type { CSSProperties } from "react";
import type {
  ScheduleAppointment,
  ScheduleAppointmentContextMenuHandler,
  ScheduleDragState,
  ScheduleDayEntry,
  SchedulePointerDragStartHandler,
  SchedulePreviewBlock,
} from "../types";
import type { AppointmentBlockDisplay } from "../../../shared/constants/appointmentBlockDisplay";

function getBlockLayoutStyle(
  block: ScheduleAppointment | SchedulePreviewBlock,
  slotRowHeight: number,
  visibleDayCount: number,
  zIndexBase: number
): CSSProperties {
  const hasLanes = block.laneCount > 1;

  return {
    height: getRenderedSpan(block.span, visibleDayCount) * slotRowHeight - 12,
    left: hasLanes
      ? `calc(${(block.laneIndex * 100) / block.laneCount}% + 2px)`
      : 2,
    width: hasLanes
      ? `calc(${100 / block.laneCount}% - 4px)`
      : "calc(100% - 4px)",
    maxWidth: hasLanes
      ? `calc(${100 / block.laneCount}% - 4px)`
      : "calc(100% - 4px)",
    zIndex: zIndexBase + block.laneIndex,
  };
}

export function AppointmentLayer({
  appointment,
  appointmentBlockDisplay,
  dragState,
  entry,
  onAppointmentContextMenu,
  onPointerDragStart,
  slotRowHeight,
  visibleDayCount,
  isBlocked = false,
}: {
  appointment: ScheduleAppointment;
  appointmentBlockDisplay: AppointmentBlockDisplay;
  dragState: ScheduleDragState;
  entry: ScheduleDayEntry;
  onAppointmentContextMenu?: ScheduleAppointmentContextMenuHandler;
  onPointerDragStart: SchedulePointerDragStartHandler;
  slotRowHeight: number;
  visibleDayCount: number;
  isBlocked?: boolean;
}) {
  return (
    <AppointmentBlock
      appointment={appointment}
      displayOptions={appointmentBlockDisplay}
      onDoubleClick={appointment.onEdit}
      onPointerDragStart={(event, draggedAppointment) =>
        onPointerDragStart(
          event,
          draggedAppointment,
          entry.key,
          entry.resourceKey
        )
      }
      onContextMenu={onAppointmentContextMenu}
      isPreview={
        dragState?.activated && dragState.appointment.id === appointment.id
      }
      fullWidth={appointment.laneCount <= 1}
      equalWidth={appointment.laneCount > 1}
      singleSlot={getRenderedSpan(appointment.span, visibleDayCount) <= 1}
      className={[
        "absolute inset-y-[6px] min-w-0",
        isBlocked ? "cf-appointment-override" : "",
      ].join(" ")}
      style={getBlockLayoutStyle(
        appointment,
        slotRowHeight,
        visibleDayCount,
        10
      )}
    />
  );
}

export function PreviewLayer({
  appointmentBlockDisplay,
  previewBlock,
  slotAppointments,
  slotRowHeight,
  visibleDayCount,
}: {
  appointmentBlockDisplay: AppointmentBlockDisplay;
  previewBlock?: SchedulePreviewBlock | null;
  slotAppointments: ScheduleAppointment[];
  slotRowHeight: number;
  visibleDayCount: number;
}) {
  if (
    !previewBlock ||
    slotAppointments.some(
      (appointment) => appointment.id === previewBlock.appointment.id
    )
  ) {
    return null;
  }

  return (
    <AppointmentBlock
      appointment={previewBlock.appointment}
      displayOptions={appointmentBlockDisplay}
      isPreview={previewBlock.isPreview}
      fullWidth={previewBlock.laneCount <= 1}
      equalWidth={previewBlock.laneCount > 1}
      singleSlot={getRenderedSpan(previewBlock.span, visibleDayCount) <= 1}
      className="absolute inset-y-[6px] min-w-0"
      style={getBlockLayoutStyle(
        previewBlock,
        slotRowHeight,
        visibleDayCount,
        40
      )}
    />
  );
}
