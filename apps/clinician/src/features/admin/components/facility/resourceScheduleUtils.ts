import type { AdminFacility, AdminResource } from "../../types";

export function formatAdminTime(value: string | null | undefined) {
  if (!value) return "";
  const [hourValue, minuteValue] = String(value).split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  if (!Number.isInteger(hour) || !Number.isInteger(minute))
    return String(value);

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatAdminTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
) {
  return [formatAdminTime(startTime), formatAdminTime(endTime)]
    .filter(Boolean)
    .join(" - ");
}

export function getResourceRoomLabel(resource: Partial<AdminResource>) {
  const room = resource?.default_room?.trim?.() || "";
  return room || "Any room";
}

export function getResourceHoursLabel(
  resource: Partial<AdminResource>,
  facility?: Partial<AdminFacility> | null
) {
  const customHours = formatAdminTimeRange(
    resource?.operating_start_time,
    resource?.operating_end_time
  );

  if (customHours) return `Custom · ${customHours}`;

  const facilityHours = formatAdminTimeRange(
    facility?.operating_start_time,
    facility?.operating_end_time
  );

  return facilityHours
    ? `Facility default · ${facilityHours}`
    : "Facility default";
}
