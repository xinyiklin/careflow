import ScheduleAgendaView from "./ScheduleAgendaView";
import ScheduleGridView from "./ScheduleGridView";

import type { ComponentType } from "react";
import type { ScheduleViewRouterProps } from "../types";

export default function ResourceScheduleView({
  viewMode,
  ...props
}: ScheduleViewRouterProps) {
  const View = (viewMode === "agenda"
    ? ScheduleAgendaView
    : ScheduleGridView) as unknown as ComponentType<Record<string, unknown>>;
  return (
    <View
      {...props}
      allowAddColumn={false}
      resourceColumnMode
      sharedTimeRail={viewMode === "slot"}
    />
  );
}
