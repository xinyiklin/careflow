import AppointmentBlock from "../../appointments/components/AppointmentBlock";
import { getRenderedSpan } from "../utils/scheduleGridMath";

function getBlockLayoutStyle(
  block,
  slotRowHeight,
  visibleDayCount,
  zIndexBase
) {
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
      className="absolute inset-y-[6px] min-w-0"
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

export function ScheduleDragGhost({ appointmentBlockDisplay, dragState }) {
  if (!dragState?.activated) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-50 hidden md:block"
      style={{
        transform: `translate(${dragState.pointerX + 18}px, ${
          dragState.pointerY - 18
        }px)`,
      }}
    >
      <div style={{ width: 260, height: 74 }}>
        <AppointmentBlock
          appointment={dragState.appointment}
          displayOptions={appointmentBlockDisplay}
          fullWidth
          isPreview
        />
      </div>
    </div>
  );
}
