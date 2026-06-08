import { Plus } from "lucide-react";

import { formatScheduleSlotLabel } from "../utils/scheduleGridMath";
import {
  AppointmentLayer,
  PreviewLayer,
} from "./ScheduleGridAppointmentLayers";
import { DayCardHeader } from "./ScheduleGridPieces";

import type {
  ScheduleAppointment,
  ScheduleGridCommonProps,
  ScheduleTimeSlot,
  SharedScrollRef,
} from "../types";
import type { ResourceDefinition } from "../../../shared/types/domain";

export function ScheduleDayColumns({
  appointmentBlockDisplay,
  appointmentsByColumn,
  applyingSharedScrollRef,
  canAddDay,
  canRemoveDay,
  dragState,
  embedded,
  embeddedColumnTemplate,
  handleAddDay,
  handleChangeInterval,
  handleChangeResourceKey,
  handleRemoveDay,
  linkScroll,
  onAppointmentContextMenu,
  onPointerDragStart,
  onSharedScrollChange,
  onSlotDoubleClick,
  previewBlock,
  registerDayScrollRef,
  resourceOptions,
  resourceOptionsByKey,
  shouldScrollColumns,
  showIntervalSelector,
  showResourceSelector,
  showSlotDividers,
  slotRowHeightByColumn,
  syncDayScrollTops,
  timeSlotsByColumn,
  timeZone,
  visibleDayCount,
  visibleDayEntries,
}: ScheduleGridCommonProps & {
  applyingSharedScrollRef: SharedScrollRef;
  canAddDay: boolean;
  canRemoveDay: boolean;
  embedded?: boolean;
  embeddedColumnTemplate?: string;
  handleAddDay: () => void;
  handleChangeInterval: (index: number, intervalMinutes: number) => void;
  handleChangeResourceKey: (index: number, resourceKey: string) => void;
  handleRemoveDay: (index: number) => void;
  linkScroll?: boolean;
  onSharedScrollChange?: (scrollTop: number) => void;
  resourceOptions: ResourceDefinition[];
  shouldScrollColumns: boolean;
  showIntervalSelector?: boolean;
  showResourceSelector?: boolean;
  slotRowHeightByColumn: Map<string, number>;
  syncDayScrollTops: (scrollTop: number, sourceKey: string) => void;
  timeSlotsByColumn: Map<string, ScheduleTimeSlot[]>;
  timeZone: string;
}) {
  return (
    <div
      className={[
        embedded
          ? [
              "grid h-full gap-0 p-0",
              shouldScrollColumns ? "min-w-max" : "min-w-0",
            ].join(" ")
          : "flex h-full min-w-max gap-3 p-3",
      ].join(" ")}
      style={
        embedded ? { gridTemplateColumns: embeddedColumnTemplate } : undefined
      }
    >
      {visibleDayEntries.map((entry, index) => {
        const timeSlots = timeSlotsByColumn.get(entry.key) || [];
        // Bucket this column's appointments by their start slot once, so each
        // row does a single Map lookup instead of re-filtering the full array.
        // Insertion order is preserved, so per-slot rendering is unchanged.
        const columnAppointments = appointmentsByColumn.get(entry.key) || [];
        const appointmentsBySlot = new Map<number, ScheduleAppointment[]>();
        columnAppointments.forEach((appointment) => {
          const bucket = appointmentsBySlot.get(appointment.startSlot);
          if (bucket) {
            bucket.push(appointment);
          } else {
            appointmentsBySlot.set(appointment.startSlot, [appointment]);
          }
        });
        const dayPreviewBlock =
          previewBlock &&
          previewBlock.hoverDayKey === entry.key &&
          previewBlock.hoverDate === entry.date
            ? previewBlock
            : null;

        return (
          <div
            key={entry.key}
            className={[
              "flex min-h-0 flex-col overflow-hidden",
              embedded
                ? "min-w-0 border-r border-cf-border bg-transparent shadow-none last:border-r-0"
                : "w-[min(32rem,calc(100vw-9rem))] min-w-[23rem] flex-1 cf-ui-panel",
            ].join(" ")}
          >
            <DayCardHeader
              date={entry.date}
              timeZone={timeZone}
              resourceKey={entry.resourceKey}
              resourceOptions={resourceOptions}
              intervalMinutes={entry.intervalMinutes}
              canRemoveDay={canRemoveDay}
              onRemove={() => handleRemoveDay(index)}
              onChangeResource={(nextResourceKey) =>
                handleChangeResourceKey(index, nextResourceKey)
              }
              onChangeInterval={(nextInterval) =>
                handleChangeInterval(index, nextInterval)
              }
              isOperatingDay={entry.isOperatingDay}
              showIntervalSelector={showIntervalSelector}
              showResourceSelector={showResourceSelector}
            />

            <div
              ref={(node) => registerDayScrollRef(entry.key, node)}
              className="min-h-0 flex-1 overflow-y-auto"
              onScroll={
                linkScroll
                  ? (event) => {
                      if (applyingSharedScrollRef.current) return;
                      const nextScrollTop = event.currentTarget.scrollTop;
                      syncDayScrollTops(nextScrollTop, entry.key);
                      onSharedScrollChange?.(nextScrollTop);
                    }
                  : undefined
              }
            >
              {timeSlots.length
                ? timeSlots.map((slot, slotIndex) => {
                    const slotAppointments =
                      appointmentsBySlot.get(slotIndex) || [];
                    const slotRowHeight =
                      slotRowHeightByColumn.get(entry.key) || 42;
                    const slotPreviewBlock =
                      dayPreviewBlock &&
                      dayPreviewBlock.hoverTime24 === slot.time24
                        ? dayPreviewBlock
                        : null;
                    const isBlockedRunStart =
                      slot.isBlocked &&
                      (slotIndex === 0 || !timeSlots[slotIndex - 1]?.isBlocked);
                    // Hatch drawn once per closed run (run-start cell), spanning
                    // every slot in the run, so the diagonal is one continuous
                    // texture regardless of interval.
                    let blockedRunLength = 0;
                    if (isBlockedRunStart) {
                      for (
                        let i = slotIndex;
                        i < timeSlots.length && timeSlots[i]?.isBlocked;
                        i += 1
                      ) {
                        blockedRunLength += 1;
                      }
                    }

                    return (
                      <div
                        key={`${entry.key}:${slot.value}`}
                        className={[
                          "flex",
                          showSlotDividers
                            ? "border-b border-cf-border last:border-b-0"
                            : "",
                        ].join(" ")}
                        style={{ height: slotRowHeight }}
                      >
                        <div
                          className={[
                            "w-[56px] min-h-0 shrink-0 select-none overflow-hidden bg-cf-surface-muted px-1.5 py-2 text-right font-mono text-[11px] font-semibold leading-none tabular-nums text-cf-text-subtle",
                            showSlotDividers ? "border-r border-cf-border" : "",
                          ].join(" ")}
                        >
                          {formatScheduleSlotLabel(slot.time24)}
                        </div>

                        <div
                          className={[
                            "relative flex flex-1 gap-1.5 px-2 py-1",
                            slot.isBlocked ? "cf-blocked-slot" : "",
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
                          {isBlockedRunStart ? (
                            <>
                              <div
                                aria-hidden="true"
                                className="cf-blocked-hatch pointer-events-none absolute inset-x-0 top-0 z-[1]"
                                style={{
                                  height: blockedRunLength * slotRowHeight,
                                }}
                              />
                              <span className="pointer-events-none absolute left-2 top-1 z-[2] select-none text-[9px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle/70">
                                Closed
                              </span>
                            </>
                          ) : null}

                          {slotAppointments.map((appointment) => (
                            <AppointmentLayer
                              key={appointment.id}
                              appointment={appointment}
                              appointmentBlockDisplay={appointmentBlockDisplay}
                              dragState={dragState}
                              entry={entry}
                              onAppointmentContextMenu={
                                onAppointmentContextMenu
                              }
                              onPointerDragStart={onPointerDragStart}
                              slotRowHeight={slotRowHeight}
                              visibleDayCount={visibleDayCount}
                              isBlocked={slot.isBlocked}
                            />
                          ))}

                          <PreviewLayer
                            appointmentBlockDisplay={appointmentBlockDisplay}
                            previewBlock={slotPreviewBlock}
                            slotAppointments={slotAppointments}
                            slotRowHeight={slotRowHeight}
                            visibleDayCount={visibleDayCount}
                          />
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>
          </div>
        );
      })}

      {canAddDay ? (
        <button
          type="button"
          onClick={handleAddDay}
          aria-label="Add day column"
          className={[
            "flex h-full min-h-0 w-12 shrink-0 items-center justify-center border border-dashed border-cf-border px-1.5 text-cf-text-muted transition hover:border-cf-border-strong hover:text-cf-text",
            embedded
              ? "bg-cf-surface/65 hover:bg-cf-surface-muted/75"
              : "bg-cf-surface-soft/70 hover:bg-cf-surface",
          ].join(" ")}
        >
          <Plus className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
