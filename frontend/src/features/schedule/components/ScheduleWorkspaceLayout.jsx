import { useMemo } from "react";

import MultiDayScheduleView from "./MultiDayScheduleView";
import ResourceScheduleView from "./ResourceScheduleView";
import ScheduleHeader from "./ScheduleHeader";
import ScheduleSidebar from "./ScheduleSidebar";

function buildResourceLoadSummaries(
  resourceDefinitions,
  formattedAppointments,
  selectedDate
) {
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
}) {
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-0 pt-0 pb-4">
      <section className="cf-preview-surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScheduleHeader
          facility={facility}
          scheduleMode={scheduleMode}
          activeScheduleInterval={activeScheduleInterval}
          onScheduleModeChange={onScheduleModeChange}
          onScheduleIntervalChange={onScheduleIntervalChange}
        />

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
          <ScheduleSidebar
            facilityId={facilityId}
            facility={facility}
            selectedDate={selectedDate}
            scheduleMode={scheduleMode}
            resourceLoadSummaries={resourceLoadSummaries}
            selectedResourceKeySet={selectedResourceKeySet}
            onJumpToToday={onJumpToToday}
            onSelectDate={onSelectDate}
            onToggleResource={onToggleResource}
          />

          <div className="min-h-0 overflow-hidden bg-cf-surface/70">
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
      </section>
    </div>
  );
}
