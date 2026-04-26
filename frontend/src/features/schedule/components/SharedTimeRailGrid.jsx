import { formatScheduleSlotLabel } from "../utils/scheduleGridMath";
import {
  AppointmentLayer,
  PreviewLayer,
} from "./ScheduleGridAppointmentLayers";
import {
  ClosedScheduleMessage,
  ResourceColumnHeader,
} from "./ScheduleGridPieces";

export default function SharedTimeRailGrid({
  appointmentBlockDisplay,
  appointmentsByColumn,
  dragState,
  onAppointmentContextMenu,
  onPointerDragStart,
  onSlotDoubleClick,
  previewBlock,
  registerDayScrollRef,
  resourceOptionsByKey,
  sharedSlotRowHeight,
  sharedTimeRailGridTemplate,
  sharedTimeSlots,
  showSlotDividers,
  timeZoneAbbreviation,
  visibleDayCount,
  visibleDayEntries,
}) {
  return (
    <div className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-cf-surface/60">
      <div
        className="sticky top-0 z-10 grid border-b border-cf-border bg-cf-surface/95 backdrop-blur"
        style={{ gridTemplateColumns: sharedTimeRailGridTemplate }}
      >
        <div className="select-none bg-cf-surface px-2 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
          {timeZoneAbbreviation}
        </div>
        {visibleDayEntries.map((entry) => (
          <ResourceColumnHeader
            key={entry.key}
            resource={resourceOptionsByKey.get(entry.resourceKey)}
            appointmentCount={appointmentsByColumn.get(entry.key)?.length || 0}
            intervalMinutes={entry.intervalMinutes}
            isOperatingDay={entry.isOperatingDay}
          />
        ))}
      </div>

      <div
        ref={(node) => {
          visibleDayEntries.forEach((entry) =>
            registerDayScrollRef(entry.key, node)
          );
        }}
        className="min-h-0 overflow-y-auto"
      >
        {sharedTimeSlots.length ? (
          sharedTimeSlots.map((slot, slotIndex) => (
            <div
              key={`shared:${slot.value}`}
              className={[
                "grid",
                showSlotDividers
                  ? "border-b border-cf-border last:border-b-0"
                  : "",
              ].join(" ")}
              style={{
                gridTemplateColumns: sharedTimeRailGridTemplate,
                height: sharedSlotRowHeight,
              }}
            >
              <div
                className={[
                  "select-none bg-cf-surface-muted/80 px-1.5 py-2 text-right font-mono text-[11px] font-semibold tabular-nums text-cf-text-subtle",
                  showSlotDividers ? "border-r border-cf-border" : "",
                ].join(" ")}
              >
                {formatScheduleSlotLabel(slot.time24)}
              </div>

              {visibleDayEntries.map((entry) => {
                const slotAppointments = (
                  appointmentsByColumn.get(entry.key) || []
                ).filter((appointment) => appointment.startSlot === slotIndex);
                const dayPreviewBlock =
                  previewBlock &&
                  previewBlock.hoverDayKey === entry.key &&
                  previewBlock.hoverDate === entry.date &&
                  previewBlock.hoverTime24 === slot.time24
                    ? previewBlock
                    : null;

                return (
                  <div
                    key={`${entry.key}:${slot.value}`}
                    className={[
                      "relative min-w-0 bg-cf-surface/45 px-2 py-1",
                      showSlotDividers
                        ? "border-r border-cf-border last:border-r-0"
                        : "",
                    ].join(" ")}
                    data-drop-slot="true"
                    data-drop-day-key={entry.key}
                    data-drop-date={entry.date}
                    data-drop-resource-key={entry.resourceKey}
                    data-drop-slot-time={slot.time24}
                    onDoubleClick={() =>
                      onSlotDoubleClick?.(
                        entry.date,
                        slot.time24,
                        resourceOptionsByKey.get(entry.resourceKey)
                          ?.resourceId || ""
                      )
                    }
                  >
                    {slotAppointments.map((appointment) => (
                      <AppointmentLayer
                        key={appointment.id}
                        appointment={appointment}
                        appointmentBlockDisplay={appointmentBlockDisplay}
                        dragState={dragState}
                        entry={entry}
                        onAppointmentContextMenu={onAppointmentContextMenu}
                        onPointerDragStart={onPointerDragStart}
                        slotRowHeight={sharedSlotRowHeight}
                        visibleDayCount={visibleDayCount}
                      />
                    ))}

                    <PreviewLayer
                      appointmentBlockDisplay={appointmentBlockDisplay}
                      previewBlock={dayPreviewBlock}
                      slotAppointments={slotAppointments}
                      slotRowHeight={sharedSlotRowHeight}
                      visibleDayCount={visibleDayCount}
                    />
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <ClosedScheduleMessage />
        )}
      </div>
    </div>
  );
}
