import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getTodayInTimeZone } from "../../../shared/utils/dateTime";
import useSchedulePageResources from "./useSchedulePageResources";
import {
  DEFAULT_MULTI_DAY_COLUMN_COUNT,
  DEFAULT_RESOURCE_COLUMN_COUNT,
  DEFAULT_SLOT_INTERVAL,
  MAX_SCHEDULE_COLUMNS,
  SLOT_INTERVAL_OPTIONS,
} from "../utils/scheduleConstants";
import {
  buildVisibleDates,
  getDateRangeBounds,
} from "../utils/scheduleDateUtils";
import { areStringArraysEqual } from "../utils/scheduleResourceUtils";

function sanitizeScheduleStartMode(value) {
  return value === "days" ? "days" : "resources";
}

export default function useSchedulePageColumns({
  facility,
  preferences,
  resources,
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [scheduleMode, setScheduleMode] = useState(() =>
    sanitizeScheduleStartMode(preferences.scheduleStartMode)
  );
  const [resourceColumnCount, setResourceColumnCount] = useState(
    DEFAULT_RESOURCE_COLUMN_COUNT
  );
  const [multiDayColumnCount, setMultiDayColumnCount] = useState(
    DEFAULT_MULTI_DAY_COLUMN_COUNT
  );
  const [, setVisibleDates] = useState([]);
  const [visibleColumnIntervals, setVisibleColumnIntervals] = useState([
    DEFAULT_SLOT_INTERVAL,
  ]);
  const hasManualScheduleModeRef = useRef(false);
  const scheduleStartMode = sanitizeScheduleStartMode(
    preferences.scheduleStartMode
  );
  const visibleDayCount =
    scheduleMode === "days" ? multiDayColumnCount : resourceColumnCount;
  const activeScheduleInterval =
    visibleColumnIntervals[0] || DEFAULT_SLOT_INTERVAL;
  const {
    activeColumnResourceKeys,
    handleColumnResourceKeysChange,
    handleScheduleModeResourceChange,
    handleToggleScheduleResource,
    multiDayResourceKey,
    resourceDefinitions,
    visibleColumnResourceKeys,
  } = useSchedulePageResources({
    resourceColumnCount,
    resources,
    scheduleMode,
    setResourceColumnCount,
    visibleDayCount,
  });

  const setActiveVisibleDayCount = useCallback(
    (nextCount) => {
      const normalizedCount = Math.min(
        Math.max(Number(nextCount) || 1, 1),
        MAX_SCHEDULE_COLUMNS
      );

      if (scheduleMode === "days") {
        setMultiDayColumnCount(normalizedCount);
        return;
      }

      setResourceColumnCount(normalizedCount);
    },
    [scheduleMode]
  );

  useEffect(() => {
    if (!facility?.timezone) return;
    setSelectedDate((prev) => prev || getTodayInTimeZone(facility.timezone));
  }, [facility?.timezone]);

  useEffect(() => {
    if (hasManualScheduleModeRef.current) return;
    setScheduleMode(scheduleStartMode);
  }, [scheduleStartMode]);

  useEffect(() => {
    if (!facility?.timezone || !selectedDate) return;

    setVisibleDates((current) => {
      const boundedDayCount = Math.min(
        Math.max(visibleDayCount, 1),
        MAX_SCHEDULE_COLUMNS
      );

      if (!current.length) {
        return buildVisibleDates(
          selectedDate,
          boundedDayCount,
          facility.timezone,
          scheduleMode === "days" ? "days" : "resource"
        );
      }

      if (current.length === boundedDayCount) {
        const nextDates = buildVisibleDates(
          selectedDate,
          boundedDayCount,
          facility.timezone,
          scheduleMode === "days" ? "days" : "resource"
        );
        return areStringArraysEqual(current, nextDates) ? current : nextDates;
      }

      if (current.length > boundedDayCount) {
        return current.slice(0, boundedDayCount);
      }

      return buildVisibleDates(
        selectedDate,
        boundedDayCount,
        facility.timezone,
        scheduleMode === "days" ? "days" : "resource"
      );
    });
  }, [facility?.timezone, scheduleMode, selectedDate, visibleDayCount]);

  useEffect(() => {
    setVisibleColumnIntervals((current) => {
      const nextLength = Math.min(
        Math.max(visibleDayCount, 1),
        MAX_SCHEDULE_COLUMNS
      );
      const nextIntervals = current.slice(0, nextLength);

      while (nextIntervals.length < nextLength) {
        nextIntervals.push(
          scheduleMode === "days"
            ? nextIntervals[0] || current[0] || DEFAULT_SLOT_INTERVAL
            : DEFAULT_SLOT_INTERVAL
        );
      }

      return nextIntervals;
    });
  }, [scheduleMode, visibleDayCount]);

  const effectiveVisibleDates = useMemo(() => {
    if (!facility?.timezone || !selectedDate) return [];
    return buildVisibleDates(
      selectedDate,
      Math.min(Math.max(visibleDayCount, 1), MAX_SCHEDULE_COLUMNS),
      facility.timezone,
      scheduleMode === "days" ? "days" : "resource"
    );
  }, [facility?.timezone, scheduleMode, selectedDate, visibleDayCount]);

  const { minDate: queryDate, maxDate: lastVisibleDate } = useMemo(
    () => getDateRangeBounds(effectiveVisibleDates),
    [effectiveVisibleDates]
  );

  const handleScheduleIntervalChange = useCallback(
    (nextInterval) => {
      const normalizedInterval = SLOT_INTERVAL_OPTIONS.includes(
        Number(nextInterval)
      )
        ? Number(nextInterval)
        : DEFAULT_SLOT_INTERVAL;
      const nextLength = Math.min(
        Math.max(visibleDayCount, 1),
        MAX_SCHEDULE_COLUMNS
      );

      setVisibleColumnIntervals(
        Array.from({ length: nextLength }, () => normalizedInterval)
      );
    },
    [visibleDayCount]
  );

  const handleVisibleDatesChange = useCallback(
    (nextDates) => {
      const nextCount = Math.min(
        Math.max(nextDates.length || 1, 1),
        MAX_SCHEDULE_COLUMNS
      );

      setVisibleDates(nextDates);
      setActiveVisibleDayCount(nextCount);

      if (nextDates[0]) {
        setSelectedDate(nextDates[0]);
      }
    },
    [setActiveVisibleDayCount]
  );

  const handleSelectScheduleDate = useCallback((nextDate) => {
    if (!nextDate) return;
    setSelectedDate(nextDate);
  }, []);

  const handleJumpToToday = useCallback(() => {
    if (!facility?.timezone) return;
    setSelectedDate(getTodayInTimeZone(facility.timezone));
  }, [facility?.timezone]);

  const handleQuickActionToday = useCallback(() => {
    if (!facility?.timezone) return false;
    const today = getTodayInTimeZone(facility.timezone);
    const nextDayCount = Math.min(
      Math.max(visibleDayCount, 1),
      MAX_SCHEDULE_COLUMNS
    );

    setSelectedDate(today);
    setVisibleDates(
      buildVisibleDates(
        today,
        nextDayCount,
        facility.timezone,
        scheduleMode === "days" ? "days" : "resource"
      )
    );
    return true;
  }, [facility?.timezone, scheduleMode, visibleDayCount]);

  const handleScheduleModeChange = useCallback(
    (nextMode) => {
      hasManualScheduleModeRef.current = true;
      setScheduleMode(nextMode);

      handleScheduleModeResourceChange(nextMode);
    },
    [handleScheduleModeResourceChange]
  );

  return {
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
  };
}
