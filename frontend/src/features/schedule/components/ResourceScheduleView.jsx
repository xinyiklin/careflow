import ScheduleAgendaView from "./ScheduleAgendaView";
import ScheduleGridView from "./ScheduleGridView";

export default function ResourceScheduleView({ viewMode, ...props }) {
  const View = viewMode === "agenda" ? ScheduleAgendaView : ScheduleGridView;
  return (
    <View
      {...props}
      allowAddColumn={false}
      resourceColumnMode
      sharedTimeRail={viewMode === "slot"}
    />
  );
}
