import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DRAG_START_THRESHOLD } from "../utils/scheduleConstants";
import {
  buildPositionedAppointments,
  getAppointmentDurationMinutes,
  getAppointmentSpan,
  getSlotRowHeight,
  toMinutes,
  toTime24,
} from "../utils/scheduleGridMath";
import { doesAppointmentMatchResource } from "../utils/scheduleResourceUtils";
import useScheduleGridColumns from "../hooks/useScheduleGridColumns";
import {
  ScheduleDatePicker,
  ScheduleDayColumns,
  ScheduleDragGhost,
  ScheduleGridToolbar,
  SharedTimeRailGrid,
} from "./ScheduleGridRenderers";

export default function ScheduleGridView({
  appointments,
  selectedDate,
  timeZone,
  facility = null,
  onDateChange,
  onSlotDoubleClick,
  onAppointmentDrop,
  onAppointmentContextMenu,
  intervalMinutes = 15,
  visibleDayCount = 1,
  visibleDates = [],
  columnResourceKeys = [],
  columnIntervals = [],
  resourceOptions = [],
  onVisibleDatesChange,
  onColumnResourceKeysChange,
  onColumnIntervalsChange,
  onVisibleDayCountChange,
  linkScroll = false,
  sharedScrollTop = 0,
  onSharedScrollChange = null,
  allowAddColumn = true,
  sharedTimeRail = false,
  scrollColumnsAt = null,
  showIntervalSelector = true,
  showResourceSelector = true,
  resourceColumnMode = false,
  showSlotDividers = true,
  appointmentBlockDisplay,
  showToolbar = true,
  embedded = false,
}) {
  const horizontalScrollRef = useRef(null);
  const dayScrollRefs = useRef(new Map());
  const applyingSharedScrollRef = useRef(false);
  const [dragState, setDragState] = useState(null);
  const [settleState, setSettleState] = useState(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDatePickerIndex, setActiveDatePickerIndex] = useState(null);
  const {
    canAddDay,
    canRemoveDay,
    changeDay,
    embeddedColumnTemplate,
    formattedSelectedDate,
    handleAddDay,
    handleChangeInterval,
    handleChangeResourceKey,
    handleChangeVisibleDate,
    handleRemoveDay,
    rawAppointmentsByColumn,
    resolvedVisibleDates,
    resourceOptionsByKey,
    scheduleWindowByColumn,
    sharedSlotRowHeight,
    sharedTimeRailGridTemplate,
    sharedTimeSlots,
    shouldScrollColumns,
    slotRowHeightByColumn,
    timeSlotsByColumn,
    timeZoneAbbreviation,
    visibleDayEntries,
  } = useScheduleGridColumns({
    appointments,
    selectedDate,
    timeZone,
    facility,
    intervalMinutes,
    visibleDayCount,
    visibleDates,
    columnResourceKeys,
    columnIntervals,
    resourceOptions,
    onDateChange,
    onVisibleDatesChange,
    onColumnResourceKeysChange,
    onColumnIntervalsChange,
    onVisibleDayCountChange,
    allowAddColumn,
    sharedTimeRail,
    scrollColumnsAt,
    embedded,
  });

  const allPositionedByColumn = useMemo(() => {
    const map = new Map();
    visibleDayEntries.forEach((entry) => {
      map.set(
        entry.key,
        buildPositionedAppointments(
          rawAppointmentsByColumn.get(entry.key) || [],
          entry.intervalMinutes,
          scheduleWindowByColumn.get(entry.key)?.startMinute
        )
      );
    });
    return map;
  }, [rawAppointmentsByColumn, scheduleWindowByColumn, visibleDayEntries]);

  const hiddenAppointmentId = dragState?.activated
    ? dragState.appointment.id
    : settleState?.appointment.id || null;

  const visibleAppointments = useMemo(
    () =>
      hiddenAppointmentId
        ? appointments.filter(
            (appointment) => appointment.id !== hiddenAppointmentId
          )
        : appointments,
    [appointments, hiddenAppointmentId]
  );

  const previewBlock = useMemo(() => {
    if (dragState?.activated) {
      const sourceLayout = Array.from(allPositionedByColumn.values())
        .flat()
        .find((appointment) => appointment.id === dragState.appointment.id);
      const targetEntry = visibleDayEntries.find(
        (entry) => entry.key === dragState.hoverDayKey
      );
      const targetTimeSlots =
        timeSlotsByColumn.get(dragState.hoverDayKey) || [];
      const targetSlot = targetTimeSlots.find(
        (slot) => slot.time24 === dragState.hoverTime24
      );
      const targetResource = resourceOptionsByKey.get(
        dragState.hoverResourceKey
      );

      if (!sourceLayout || !targetSlot || !targetEntry) return null;

      const previewAppointment = {
        ...dragState.appointment,
        date: dragState.hoverDate,
        time: targetSlot.time24,
        resource:
          targetResource?.resourceId || dragState.appointment.resource || null,
        end_time_str: toTime24(
          toMinutes(targetSlot.time24) +
            getAppointmentDurationMinutes(
              dragState.appointment,
              targetEntry.intervalMinutes
            )
        ),
      };

      return {
        appointment: previewAppointment,
        hoverDate: dragState.hoverDate,
        hoverDayKey: dragState.hoverDayKey,
        hoverTime24: dragState.hoverTime24,
        laneIndex: sourceLayout.laneIndex,
        laneCount: sourceLayout.laneCount,
        span: getAppointmentSpan(
          previewAppointment,
          targetEntry.intervalMinutes
        ),
        isPreview: true,
      };
    }

    return settleState;
  }, [
    allPositionedByColumn,
    dragState,
    resourceOptionsByKey,
    settleState,
    timeSlotsByColumn,
    visibleDayEntries,
  ]);

  const appointmentsByColumn = useMemo(() => {
    const map = new Map();
    visibleDayEntries.forEach((entry) => {
      const resource = resourceOptionsByKey.get(entry.resourceKey);
      map.set(
        entry.key,
        buildPositionedAppointments(
          visibleAppointments.filter(
            (appointment) =>
              appointment.date === entry.date &&
              doesAppointmentMatchResource(appointment, resource)
          ),
          entry.intervalMinutes,
          scheduleWindowByColumn.get(entry.key)?.startMinute
        )
      );
    });
    return map;
  }, [
    resourceOptionsByKey,
    scheduleWindowByColumn,
    visibleAppointments,
    visibleDayEntries,
  ]);

  useEffect(() => {
    if (!settleState) return undefined;

    const matchedAppointment = appointments.find(
      (appointment) =>
        appointment.id === settleState.appointment.id &&
        appointment.date === settleState.appointment.date &&
        appointment.time === settleState.appointment.time
    );

    if (matchedAppointment) {
      const timeoutId = window.setTimeout(() => {
        setSettleState(null);
      }, 140);

      return () => window.clearTimeout(timeoutId);
    }

    const fallbackTimeoutId = window.setTimeout(() => {
      setSettleState(null);
    }, 260);

    return () => window.clearTimeout(fallbackTimeoutId);
  }, [appointments, settleState]);

  const registerDayScrollRef = useCallback((key, node) => {
    if (node) {
      dayScrollRefs.current.set(key, node);
    } else {
      dayScrollRefs.current.delete(key);
    }
  }, []);

  const syncDayScrollTops = useCallback((nextScrollTop, sourceKey = null) => {
    applyingSharedScrollRef.current = true;

    dayScrollRefs.current.forEach((container, key) => {
      if (sourceKey && key === sourceKey) return;
      if (Math.abs(container.scrollTop - nextScrollTop) < 1) return;
      container.scrollTop = nextScrollTop;
    });

    window.requestAnimationFrame(() => {
      applyingSharedScrollRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (!linkScroll) return;
    syncDayScrollTops(sharedScrollTop);
  }, [linkScroll, sharedScrollTop, syncDayScrollTops, resolvedVisibleDates]);

  const handlePointerDragStart = (
    event,
    appointment,
    hoverDayKey,
    hoverResourceKey
  ) => {
    setDragState({
      appointment,
      activated: false,
      originalDate: appointment.date,
      originalTime: appointment.time,
      originalResourceKey: hoverResourceKey,
      hoverDate: appointment.date,
      hoverDayKey,
      hoverResourceKey,
      hoverTime24: appointment.time,
      startX: event.clientX,
      startY: event.clientY,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    if (dragState.activated) {
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }

    const handlePointerMove = (event) => {
      setDragState((prev) => {
        if (!prev) return prev;

        const distanceX = Math.abs(event.clientX - prev.startX);
        const distanceY = Math.abs(event.clientY - prev.startY);
        const hasMovedEnough =
          distanceX >= DRAG_START_THRESHOLD ||
          distanceY >= DRAG_START_THRESHOLD;

        if (!prev.activated && !hasMovedEnough) {
          return prev;
        }

        const hoveredElement = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest("[data-drop-slot='true']");

        const nextHoverDate =
          hoveredElement?.getAttribute("data-drop-date") || prev.hoverDate;
        const nextHoverDayKey =
          hoveredElement?.getAttribute("data-drop-day-key") || prev.hoverDayKey;
        const nextHoverResourceKey =
          hoveredElement?.getAttribute("data-drop-resource-key") ||
          prev.hoverResourceKey;
        const nextHoverTime24 =
          hoveredElement?.getAttribute("data-drop-slot-time") ||
          prev.hoverTime24;

        const hoveredDayContainer = nextHoverDayKey
          ? dayScrollRefs.current.get(nextHoverDayKey)
          : null;
        const hoveredSlotRowHeight =
          slotRowHeightByColumn.get(nextHoverDayKey) ||
          slotRowHeightByColumn.get(prev.hoverDayKey) ||
          getSlotRowHeight(intervalMinutes);

        if (hoveredDayContainer) {
          const rect = hoveredDayContainer.getBoundingClientRect();
          const verticalThreshold = Math.max(hoveredSlotRowHeight * 1.5, 56);

          if (event.clientY < rect.top + verticalThreshold) {
            hoveredDayContainer.scrollTop -= hoveredSlotRowHeight;
          } else if (event.clientY > rect.bottom - verticalThreshold) {
            hoveredDayContainer.scrollTop += hoveredSlotRowHeight;
          }
        }

        const horizontalContainer = horizontalScrollRef.current;
        if (horizontalContainer) {
          const rect = horizontalContainer.getBoundingClientRect();
          const horizontalThreshold = 120;

          if (event.clientX < rect.left + horizontalThreshold) {
            horizontalContainer.scrollLeft -= 48;
          } else if (event.clientX > rect.right - horizontalThreshold) {
            horizontalContainer.scrollLeft += 48;
          }
        }

        return {
          ...prev,
          activated: true,
          hoverDate: nextHoverDate,
          hoverDayKey: nextHoverDayKey,
          hoverResourceKey: nextHoverResourceKey,
          hoverTime24: nextHoverTime24,
          pointerX: event.clientX,
          pointerY: event.clientY,
        };
      });
    };

    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (!dragState) return;
      if (!dragState.activated) {
        setDragState(null);
        return;
      }

      const targetSlot = dragState.hoverTime24
        ? { time24: dragState.hoverTime24 }
        : null;
      const targetResource = resourceOptionsByKey.get(
        dragState.hoverResourceKey
      );
      const targetEntry = visibleDayEntries.find(
        (entry) => entry.key === dragState.hoverDayKey
      );
      const nextResourceId = targetResource?.resourceId || null;
      if (
        targetSlot &&
        targetEntry &&
        (dragState.hoverDate !== dragState.originalDate ||
          targetSlot.time24 !== dragState.originalTime ||
          String(nextResourceId || "") !==
            String(dragState.appointment.resource || ""))
      ) {
        const sourceLayout = Array.from(allPositionedByColumn.values())
          .flat()
          .find((appointment) => appointment.id === dragState.appointment.id);

        if (sourceLayout) {
          setSettleState({
            appointment: {
              ...dragState.appointment,
              date: dragState.hoverDate,
              time: targetSlot.time24,
              resource: nextResourceId,
              end_time_str: toTime24(
                toMinutes(targetSlot.time24) +
                  getAppointmentDurationMinutes(
                    dragState.appointment,
                    targetEntry.intervalMinutes
                  )
              ),
            },
            hoverDate: dragState.hoverDate,
            hoverDayKey: dragState.hoverDayKey,
            hoverTime24: targetSlot.time24,
            laneIndex: sourceLayout.laneIndex,
            laneCount: sourceLayout.laneCount,
            span: getAppointmentSpan(
              {
                ...dragState.appointment,
                time: targetSlot.time24,
                end_time_str: toTime24(
                  toMinutes(targetSlot.time24) +
                    getAppointmentDurationMinutes(
                      dragState.appointment,
                      targetEntry.intervalMinutes
                    )
                ),
              },
              targetEntry.intervalMinutes
            ),
            isPreview: false,
          });
        }

        onAppointmentDrop?.(
          dragState.hoverDate,
          targetSlot.time24,
          dragState.appointment,
          nextResourceId
        );
      }

      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    allPositionedByColumn,
    dragState,
    onAppointmentDrop,
    resourceOptionsByKey,
    slotRowHeightByColumn,
    visibleDayEntries,
    intervalMinutes,
  ]);

  return (
    <div
      className={[
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        embedded
          ? "rounded-none border-0 bg-transparent shadow-none"
          : "rounded-[1.25rem] border border-cf-border bg-cf-surface shadow-sm",
      ].join(" ")}
    >
      {showToolbar ? (
        <ScheduleGridToolbar
          dragState={dragState}
          formattedSelectedDate={formattedSelectedDate}
          onChangeDay={changeDay}
          onDateChange={onDateChange}
          onOpenDatePicker={() => {
            setActiveDatePickerIndex(0);
            setIsDatePickerOpen(true);
          }}
          resourceColumnMode={resourceColumnMode}
          timeZone={timeZone}
        />
      ) : null}

      <div
        ref={horizontalScrollRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarGutter: "stable" }}
      >
        {sharedTimeRail ? (
          <SharedTimeRailGrid
            appointmentBlockDisplay={appointmentBlockDisplay}
            appointmentsByColumn={appointmentsByColumn}
            dragState={dragState}
            onAppointmentContextMenu={onAppointmentContextMenu}
            onPointerDragStart={handlePointerDragStart}
            onSlotDoubleClick={onSlotDoubleClick}
            previewBlock={previewBlock}
            registerDayScrollRef={registerDayScrollRef}
            resourceOptionsByKey={resourceOptionsByKey}
            sharedSlotRowHeight={sharedSlotRowHeight}
            sharedTimeRailGridTemplate={sharedTimeRailGridTemplate}
            sharedTimeSlots={sharedTimeSlots}
            showSlotDividers={showSlotDividers}
            timeZoneAbbreviation={timeZoneAbbreviation}
            visibleDayCount={visibleDayCount}
            visibleDayEntries={visibleDayEntries}
          />
        ) : (
          <ScheduleDayColumns
            appointmentBlockDisplay={appointmentBlockDisplay}
            appointmentsByColumn={appointmentsByColumn}
            applyingSharedScrollRef={applyingSharedScrollRef}
            canAddDay={canAddDay}
            canRemoveDay={canRemoveDay}
            dragState={dragState}
            embedded={embedded}
            embeddedColumnTemplate={embeddedColumnTemplate}
            handleAddDay={handleAddDay}
            handleChangeInterval={handleChangeInterval}
            handleChangeResourceKey={handleChangeResourceKey}
            handleRemoveDay={handleRemoveDay}
            linkScroll={linkScroll}
            onAppointmentContextMenu={onAppointmentContextMenu}
            onPointerDragStart={handlePointerDragStart}
            onSharedScrollChange={onSharedScrollChange}
            onSlotDoubleClick={onSlotDoubleClick}
            previewBlock={previewBlock}
            registerDayScrollRef={registerDayScrollRef}
            resourceOptions={resourceOptions}
            resourceOptionsByKey={resourceOptionsByKey}
            shouldScrollColumns={shouldScrollColumns}
            showIntervalSelector={showIntervalSelector}
            showResourceSelector={showResourceSelector}
            showSlotDividers={showSlotDividers}
            slotRowHeightByColumn={slotRowHeightByColumn}
            syncDayScrollTops={syncDayScrollTops}
            timeSlotsByColumn={timeSlotsByColumn}
            timeZone={timeZone}
            visibleDayCount={visibleDayCount}
            visibleDayEntries={visibleDayEntries}
          />
        )}
      </div>

      <ScheduleDragGhost
        appointmentBlockDisplay={appointmentBlockDisplay}
        dragState={dragState}
      />

      <ScheduleDatePicker
        activeDatePickerIndex={activeDatePickerIndex}
        handleChangeVisibleDate={handleChangeVisibleDate}
        isDatePickerOpen={isDatePickerOpen}
        resolvedVisibleDates={resolvedVisibleDates}
        setActiveDatePickerIndex={setActiveDatePickerIndex}
        setIsDatePickerOpen={setIsDatePickerOpen}
        timeZone={timeZone}
      />
    </div>
  );
}
