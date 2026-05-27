import { useCallback, useEffect, useMemo } from "react";

import { generateTimeSlots } from "../../../shared/utils/timeSlots";
import {
  formatDateOnlyInTimeZone,
  parseDateOnlyInTimeZone,
} from "../../../shared/utils/dateTime";
import { MAX_SCHEDULE_COLUMNS } from "../utils/scheduleConstants";
import {
  addDaysToDateString,
  getTimeZoneAbbreviation,
} from "../utils/scheduleDateUtils";
import { getSlotRowHeight } from "../utils/scheduleGridMath";
import {
  doesAppointmentMatchResource,
  getDefaultResourceKey,
} from "../utils/scheduleResourceUtils";
import {
  getFacilityOperatingWindow,
  isFacilityOperatingDate,
} from "../utils/scheduleOperatingHours";
import {
  getAppointmentsScheduleWindow,
  mergeScheduleWindows,
} from "../utils/scheduleWindowUtils";

import type { ScheduleTimeSlot } from "../types";
import type {
  AppointmentLike,
  FacilityLike,
  ResourceDefinition,
  ScheduleWindow,
} from "../../../shared/types/domain";

type VisibleDayEntry = {
  date: string;
  index: number;
  key: string;
  resourceKey: string;
  isOperatingDay: boolean;
  intervalMinutes: number;
};

type UseScheduleGridColumnsOptions = {
  appointments: AppointmentLike[];
  selectedDate: string;
  timeZone: string;
  facility?: FacilityLike | null;
  intervalMinutes: number;
  visibleDayCount: number;
  visibleDates: string[];
  columnResourceKeys: string[];
  columnIntervals: number[];
  resourceOptions: ResourceDefinition[];
  onDateChange?: (date: string) => void;
  onVisibleDatesChange?: (dates: string[]) => void;
  onColumnResourceKeysChange?: (keys: string[]) => void;
  onColumnIntervalsChange?: (intervals: number[]) => void;
  onVisibleDayCountChange?: (count: number) => void;
  allowAddColumn?: boolean;
  sharedTimeRail?: boolean;
  scrollColumnsAt?: number | null;
  embedded?: boolean;
};

export default function useScheduleGridColumns({
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
}: UseScheduleGridColumnsOptions) {
  const resourceOptionsByKey = useMemo(
    () => new Map(resourceOptions.map((resource) => [resource.key, resource])),
    [resourceOptions]
  );

  const resolvedVisibleDates = useMemo(() => {
    if (visibleDates.length) return visibleDates;
    return Array.from({ length: visibleDayCount }, (_, index) =>
      addDaysToDateString(selectedDate, index, timeZone)
    );
  }, [selectedDate, timeZone, visibleDates, visibleDayCount]);

  const visibleDayEntries = useMemo(
    () =>
      resolvedVisibleDates.map(
        (date, index): VisibleDayEntry => ({
          date,
          index,
          key: `${date}:${index}`,
          resourceKey:
            columnResourceKeys[index] || getDefaultResourceKey(resourceOptions),
          isOperatingDay: isFacilityOperatingDate(date, timeZone, facility),
          intervalMinutes: sharedTimeRail
            ? intervalMinutes
            : columnIntervals[index] || intervalMinutes,
        })
      ),
    [
      columnIntervals,
      columnResourceKeys,
      facility,
      intervalMinutes,
      resolvedVisibleDates,
      resourceOptions,
      sharedTimeRail,
      timeZone,
    ]
  );

  const rawAppointmentsByColumn = useMemo(() => {
    const map = new Map<string, AppointmentLike[]>();
    visibleDayEntries.forEach((entry) => {
      const resource = resourceOptionsByKey.get(entry.resourceKey);
      map.set(
        entry.key,
        appointments.filter(
          (appointment) =>
            appointment.date === entry.date &&
            doesAppointmentMatchResource(appointment, resource)
        )
      );
    });
    return map;
  }, [appointments, resourceOptionsByKey, visibleDayEntries]);

  const scheduleWindowByColumn = useMemo(() => {
    const map = new Map<string, ScheduleWindow | null | undefined>();
    let sharedWindow: ScheduleWindow | null | undefined = null;

    if (sharedTimeRail) {
      visibleDayEntries.forEach((entry) => {
        const dateObj = parseDateOnlyInTimeZone(entry.date, timeZone);
        const isoDay = dateObj
          ? Number(formatDateOnlyInTimeZone(dateObj, timeZone, "i"))
          : null;
        const operatingWindow = getFacilityOperatingWindow(facility, isoDay);
        const appointmentWindow = getAppointmentsScheduleWindow(
          rawAppointmentsByColumn.get(entry.key) || [],
          entry.intervalMinutes
        );
        sharedWindow = mergeScheduleWindows(
          sharedWindow,
          mergeScheduleWindows(operatingWindow, appointmentWindow)
        );
      });
    }

    visibleDayEntries.forEach((entry) => {
      const dateObj = parseDateOnlyInTimeZone(entry.date, timeZone);
      const isoDay = dateObj
        ? Number(formatDateOnlyInTimeZone(dateObj, timeZone, "i"))
        : null;
      const operatingWindow = getFacilityOperatingWindow(facility, isoDay);
      const appointmentWindow = getAppointmentsScheduleWindow(
        rawAppointmentsByColumn.get(entry.key) || [],
        entry.intervalMinutes
      );
      map.set(
        entry.key,
        sharedTimeRail
          ? sharedWindow
          : mergeScheduleWindows(operatingWindow, appointmentWindow)
      );
    });

    return map;
  }, [
    facility,
    rawAppointmentsByColumn,
    sharedTimeRail,
    visibleDayEntries,
    timeZone,
  ]);

  const timeSlotsByColumn = useMemo(() => {
    const map = new Map<string, ScheduleTimeSlot[]>();
    visibleDayEntries.forEach((entry) => {
      const dateObj = parseDateOnlyInTimeZone(entry.date, timeZone);
      const isoDay = dateObj
        ? Number(formatDateOnlyInTimeZone(dateObj, timeZone, "i"))
        : null;
      const operatingWindow = getFacilityOperatingWindow(facility, isoDay);
      const scheduleWindow = scheduleWindowByColumn.get(entry.key);
      const slots = scheduleWindow
        ? generateTimeSlots(
            entry.intervalMinutes,
            scheduleWindow.startMinute,
            scheduleWindow.endMinute
          )
        : [];

      const mappedSlots = slots.map((slot) => {
        const isOutsideHours =
          slot.value < operatingWindow.startMinute ||
          slot.value >= operatingWindow.endMinute;
        return {
          ...slot,
          isOutsideHours,
          isBlocked: !entry.isOperatingDay || isOutsideHours,
        };
      });

      map.set(entry.key, mappedSlots);
    });
    return map;
  }, [facility, scheduleWindowByColumn, visibleDayEntries, timeZone]);

  const slotRowHeightByColumn = useMemo(() => {
    const map = new Map<string, number>();
    visibleDayEntries.forEach((entry) => {
      map.set(entry.key, getSlotRowHeight(entry.intervalMinutes));
    });
    return map;
  }, [visibleDayEntries]);

  useEffect(() => {
    if (visibleDayCount < 1) onVisibleDayCountChange?.(1);
  }, [visibleDayCount, onVisibleDayCountChange]);

  const canRemoveDay = visibleDayEntries.length > 1;
  const canAddDay =
    allowAddColumn && visibleDayEntries.length < MAX_SCHEDULE_COLUMNS;
  const shouldScrollColumns =
    embedded &&
    scrollColumnsAt != null &&
    visibleDayEntries.length >= scrollColumnsAt;
  const embeddedColumnTrack = shouldScrollColumns
    ? `repeat(${Math.max(visibleDayEntries.length, 1)}, minmax(18rem, 18rem))`
    : `repeat(${Math.max(visibleDayEntries.length, 1)}, minmax(0, 1fr))`;
  const embeddedColumnTemplate = embedded
    ? `${embeddedColumnTrack}${canAddDay ? " 3rem" : ""}`
    : undefined;
  const sharedTimeRailGridTemplate = `56px repeat(${Math.max(
    visibleDayEntries.length,
    1
  )}, minmax(0, 1fr))`;
  const timeZoneAbbreviation = useMemo(
    () => getTimeZoneAbbreviation(selectedDate, timeZone),
    [selectedDate, timeZone]
  );
  const sharedTimeRailEntry = visibleDayEntries[0];
  const sharedTimeSlots = timeSlotsByColumn.get(sharedTimeRailEntry?.key) || [];
  const sharedSlotRowHeight =
    slotRowHeightByColumn.get(sharedTimeRailEntry?.key) ||
    getSlotRowHeight(intervalMinutes);
  const handleRemoveDay = useCallback(
    (removeIndex: number) => {
      if (!canRemoveDay) return;

      const nextDates = resolvedVisibleDates.filter(
        (_, index) => index !== removeIndex
      );
      const nextResourceKeys = visibleDayEntries
        .filter((_, index) => index !== removeIndex)
        .map((entry) => entry.resourceKey);
      const nextIntervals = visibleDayEntries
        .filter((_, index) => index !== removeIndex)
        .map((entry) => entry.intervalMinutes);
      if (removeIndex === 0 && nextDates[0]) {
        onDateChange?.(nextDates[0]);
      }
      onVisibleDatesChange?.(nextDates);
      onColumnResourceKeysChange?.(nextResourceKeys);
      onColumnIntervalsChange?.(nextIntervals);
      onVisibleDayCountChange?.(nextDates.length);
    },
    [
      canRemoveDay,
      onColumnIntervalsChange,
      onColumnResourceKeysChange,
      onDateChange,
      onVisibleDatesChange,
      onVisibleDayCountChange,
      resolvedVisibleDates,
      visibleDayEntries,
    ]
  );

  const handleAddDay = useCallback(() => {
    if (!canAddDay) return;

    const anchorDate =
      resolvedVisibleDates[resolvedVisibleDates.length - 1] || selectedDate;
    const nextDate = addDaysToDateString(anchorDate, 1, timeZone);
    const nextDates = [...resolvedVisibleDates, nextDate];

    onVisibleDatesChange?.(nextDates);
    onColumnResourceKeysChange?.([
      ...visibleDayEntries.map((entry) => entry.resourceKey),
      visibleDayEntries[visibleDayEntries.length - 1]?.resourceKey ||
        visibleDayEntries[0]?.resourceKey ||
        getDefaultResourceKey(resourceOptions),
    ]);
    onColumnIntervalsChange?.([
      ...visibleDayEntries.map((entry) => entry.intervalMinutes),
      intervalMinutes,
    ]);
    onVisibleDayCountChange?.(nextDates.length);
  }, [
    canAddDay,
    intervalMinutes,
    onColumnIntervalsChange,
    onColumnResourceKeysChange,
    onVisibleDatesChange,
    onVisibleDayCountChange,
    resolvedVisibleDates,
    resourceOptions,
    selectedDate,
    timeZone,
    visibleDayEntries,
  ]);

  const handleChangeVisibleDate = useCallback(
    (targetIndex: number, nextDate: string) => {
      const nextDates = resolvedVisibleDates.map((date, index) =>
        index === targetIndex ? nextDate : date
      );

      onVisibleDatesChange?.(nextDates);
      if (targetIndex === 0) {
        onDateChange?.(nextDate);
      }
    },
    [onDateChange, onVisibleDatesChange, resolvedVisibleDates]
  );

  const handleChangeResourceKey = useCallback(
    (targetIndex: number, nextResourceKey: string) => {
      const nextResourceKeys = visibleDayEntries.map((entry, index) =>
        index === targetIndex ? nextResourceKey : entry.resourceKey
      );
      onColumnResourceKeysChange?.(nextResourceKeys);
    },
    [onColumnResourceKeysChange, visibleDayEntries]
  );

  const handleChangeInterval = useCallback(
    (targetIndex: number, nextInterval: number) => {
      const nextIntervals = visibleDayEntries.map((entry, index) =>
        index === targetIndex ? nextInterval : entry.intervalMinutes
      );
      onColumnIntervalsChange?.(nextIntervals);
    },
    [onColumnIntervalsChange, visibleDayEntries]
  );

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    if (resolvedVisibleDates.length === 1) {
      return formatDateOnlyInTimeZone(selectedDate, timeZone, "MMM d, yyyy");
    }

    const sortedDates = [...resolvedVisibleDates].sort((left, right) =>
      left.localeCompare(right)
    );
    return `${formatDateOnlyInTimeZone(
      sortedDates[0],
      timeZone,
      "MMM d"
    )} - ${formatDateOnlyInTimeZone(
      sortedDates[sortedDates.length - 1],
      timeZone,
      "MMM d, yyyy"
    )}`;
  }, [resolvedVisibleDates, selectedDate, timeZone]);

  const changeDay = useCallback(
    (offset: number) => {
      if (!onDateChange) return;
      onDateChange(addDaysToDateString(selectedDate, offset, timeZone));
    },
    [onDateChange, selectedDate, timeZone]
  );

  return {
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
  };
}
