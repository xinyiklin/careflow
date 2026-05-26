import { useMemo } from "react";

import MultiDayScheduleView from "./MultiDayScheduleView";
import ResourceScheduleView from "./ResourceScheduleView";
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-cf-surface">
        <div className="grid min-h-0 flex-1 overflow-hidden bg-cf-surface lg:grid-cols-[280px_minmax(0,1fr)]">
          <ScheduleSidebar
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
