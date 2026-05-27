import ScheduleAgendaView from "./ScheduleAgendaView";
import ScheduleGridView from "./ScheduleGridView";

import type { ComponentType } from "react";
import type { ScheduleViewRouterProps } from "../types";

export default function MultiDayScheduleView({
  viewMode,
  ...props
}: ScheduleViewRouterProps) {
  const View = (viewMode === "agenda"
    ? ScheduleAgendaView
    : ScheduleGridView) as unknown as ComponentType<Record<string, unknown>>;
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
