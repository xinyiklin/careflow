import ScheduleAgendaView from "./ScheduleAgendaView";
import ScheduleGridView from "./ScheduleGridView";

export default function MultiDayScheduleView({ viewMode, ...props }) {
  const View = viewMode === "agenda" ? ScheduleAgendaView : ScheduleGridView;
  return (
    <View
      {...props}
      allowAddColumn
      sharedTimeRail={false}
      showIntervalSelector={false}
      showResourceSelector={false}
    />
  );
}
