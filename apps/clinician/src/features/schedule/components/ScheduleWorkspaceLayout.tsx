import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

import { formatDateOnlyInTimeZone } from "../../../shared/utils/dateTime";
import MultiDayScheduleView from "./MultiDayScheduleView";
import ResourceScheduleView from "./ResourceScheduleView";
import ScheduleHeader from "./ScheduleHeader";
import ScheduleSidebar from "./ScheduleSidebar";

import type {
  ResourceLoadSummary,
  ScheduleWorkspaceLayoutProps,
} from "../types";
import type {
  AppointmentLike,
  ResourceDefinition,
} from "../../../shared/types/domain";

function buildResourceLoadSummaries(
  resourceDefinitions: ResourceDefinition[],
  formattedAppointments: AppointmentLike[],
  selectedDate: string
): ResourceLoadSummary[] {
  const dotClasses = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-sky-500",
    "bg-amber-500",
  ];

  return resourceDefinitions.map((resource, index) => {
    const count = formattedAppointments.filter(
      (appointment) =>
        appointment.date === selectedDate &&
        String(appointment.resource || "") === String(resource.resourceId || "")
    ).length;

    return {
      ...resource,
      count,
      dotClassName: dotClasses[index % dotClasses.length],
    };
  });
}

export default function ScheduleWorkspaceLayout({
  facilityId,
  facility,
  selectedDate,
  scheduleMode,
  viewMode,
  showSlotDividers,
  showScheduleFullDay,
  blockedSlotAppearance,
  appointmentBlockDisplay,
  activeScheduleInterval,
  formattedAppointments,
  resourceDefinitions,
  activeColumnResourceKeys,
  effectiveVisibleDates,
  visibleColumnIntervals,
  visibleDayCount,
  onSelectDate,
  onJumpToToday,
  onScheduleModeChange,
  onScheduleIntervalChange,
  onToggleResource,
  onVisibleDatesChange,
  onColumnResourceKeysChange,
  onVisibleDayCountChange,
  onSlotDoubleClick,
  onAppointmentDrop,
  onAppointmentContextMenu,
  onColumnIntervalsChange,
}: ScheduleWorkspaceLayoutProps) {
  const resourceLoadSummaries = useMemo(
    () =>
      buildResourceLoadSummaries(
        resourceDefinitions,
        formattedAppointments,
        selectedDate
      ),
    [formattedAppointments, resourceDefinitions, selectedDate]
  );
  const selectedResourceKeySet = useMemo(
    () => new Set(activeColumnResourceKeys.filter(Boolean)),
    [activeColumnResourceKeys]
  );
  const drawerId = useId();
  const drawerToggleRef = useRef<HTMLButtonElement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsDrawerOpen(false);
      if (document.getElementById(drawerId)?.contains(document.activeElement)) {
        drawerToggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerId, isDrawerOpen]);

  const selectedDateLabel = formatDateOnlyInTimeZone(
    selectedDate,
    facility?.timezone,
    "EEE, MMM d"
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-cf-surface">
        <div className="shrink-0 border-b border-cf-border bg-cf-surface-muted/70 px-3 py-2 lg:hidden">
          <ScheduleHeader
            compact
            facility={facility}
            scheduleMode={scheduleMode}
            activeScheduleInterval={activeScheduleInterval}
            onScheduleModeChange={onScheduleModeChange}
            onScheduleIntervalChange={onScheduleIntervalChange}
            titleAction={
              <button
                ref={drawerToggleRef}
                type="button"
                onClick={() => setIsDrawerOpen((current) => !current)}
                aria-expanded={isDrawerOpen}
                aria-controls={drawerId}
                aria-label={`${selectedDateLabel}, calendar and resources`}
                className={[
                  "group flex min-h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition-colors",
                  isDrawerOpen
                    ? "border-cf-border-strong bg-cf-surface text-cf-text"
                    : "border-cf-border bg-cf-surface text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
                ].join(" ")}
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
                <span className="whitespace-nowrap tabular-nums">
                  {selectedDateLabel}
                </span>
                <ChevronDown
                  className={[
                    "h-3 w-3 shrink-0 text-cf-text-subtle transition-transform duration-150 group-hover:text-cf-text",
                    isDrawerOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
            }
          />
        </div>

        <div className="relative grid min-h-0 flex-1 overflow-hidden bg-cf-surface lg:grid-cols-[280px_minmax(0,1fr)]">
          <ScheduleSidebar
            drawerId={drawerId}
            isDrawerOpen={isDrawerOpen}
            facilityId={facilityId}
            facility={facility}
            selectedDate={selectedDate}
            scheduleMode={scheduleMode}
            activeScheduleInterval={activeScheduleInterval}
            resourceLoadSummaries={resourceLoadSummaries}
            selectedResourceKeySet={selectedResourceKeySet}
            onJumpToToday={onJumpToToday}
            onSelectDate={onSelectDate}
            onScheduleModeChange={onScheduleModeChange}
            onScheduleIntervalChange={onScheduleIntervalChange}
            onToggleResource={onToggleResource}
          />

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-cf-surface">
            <div className="min-h-0 flex-1 overflow-hidden bg-cf-surface-muted/30">
              {scheduleMode === "days" ? (
                <MultiDayScheduleView
                  viewMode={viewMode}
                  showSlotDividers={showSlotDividers}
                  showScheduleFullDay={showScheduleFullDay}
                  blockedSlotAppearance={blockedSlotAppearance}
                  appointmentBlockDisplay={appointmentBlockDisplay}
                  appointments={formattedAppointments}
                  selectedDate={selectedDate}
                  timeZone={facility?.timezone}
                  facility={facility}
                  onDateChange={onSelectDate}
                  visibleDates={effectiveVisibleDates}
                  columnResourceKeys={activeColumnResourceKeys}
                  resourceOptions={resourceDefinitions}
                  onVisibleDatesChange={onVisibleDatesChange}
                  onColumnResourceKeysChange={onColumnResourceKeysChange}
                  onVisibleDayCountChange={onVisibleDayCountChange}
                  onSlotDoubleClick={onSlotDoubleClick}
                  onAppointmentDrop={onAppointmentDrop}
                  onAppointmentContextMenu={onAppointmentContextMenu}
                  columnIntervals={visibleColumnIntervals}
                  onColumnIntervalsChange={onColumnIntervalsChange}
                  intervalMinutes={activeScheduleInterval}
                  visibleDayCount={visibleDayCount}
                  linkScroll={false}
                  showToolbar={false}
                  embedded
                />
              ) : (
                <ResourceScheduleView
                  viewMode={viewMode}
                  showSlotDividers={showSlotDividers}
                  showScheduleFullDay={showScheduleFullDay}
                  blockedSlotAppearance={blockedSlotAppearance}
                  appointmentBlockDisplay={appointmentBlockDisplay}
                  appointments={formattedAppointments}
                  selectedDate={selectedDate}
                  timeZone={facility?.timezone}
                  facility={facility}
                  onDateChange={onSelectDate}
                  visibleDates={effectiveVisibleDates}
                  onVisibleDatesChange={onVisibleDatesChange}
                  columnResourceKeys={activeColumnResourceKeys}
                  onColumnResourceKeysChange={onColumnResourceKeysChange}
                  resourceOptions={resourceDefinitions}
                  onSlotDoubleClick={onSlotDoubleClick}
                  onAppointmentDrop={onAppointmentDrop}
                  onAppointmentContextMenu={onAppointmentContextMenu}
                  columnIntervals={visibleColumnIntervals}
                  onColumnIntervalsChange={onColumnIntervalsChange}
                  intervalMinutes={activeScheduleInterval}
                  visibleDayCount={visibleDayCount}
                  onVisibleDayCountChange={onVisibleDayCountChange}
                  linkScroll={false}
                  showToolbar={false}
                  embedded
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
