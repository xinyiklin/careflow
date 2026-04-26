export const DEFAULT_APPOINTMENT_BLOCK_DISPLAY = {
  showStatusChip: true,
  showVisitType: true,
  showRoom: true,
  showResource: false,
  showProvider: false,
  showReason: false,
};

export const APPOINTMENT_BLOCK_DISPLAY_OPTIONS = [
  {
    key: "showStatusChip",
    label: "Status chip",
  },
  {
    key: "showVisitType",
    label: "Visit type",
  },
  {
    key: "showRoom",
    label: "Room",
  },
  {
    key: "showResource",
    label: "Resource",
  },
  {
    key: "showProvider",
    label: "Provider",
  },
  {
    key: "showReason",
    label: "Reason",
  },
];

export function sanitizeAppointmentBlockDisplay(value) {
  const nextValue =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return Object.fromEntries(
    Object.entries(DEFAULT_APPOINTMENT_BLOCK_DISPLAY).map(
      ([key, defaultValue]) => [
        key,
        typeof nextValue[key] === "boolean" ? nextValue[key] : defaultValue,
      ]
    )
  );
}
