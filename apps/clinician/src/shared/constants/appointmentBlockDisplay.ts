export const DEFAULT_APPOINTMENT_BLOCK_DISPLAY = {
  colorMode: "visitBlockStatusChip",
  showStatusChip: true,
  showVisitType: true,
  showRoom: true,
  showResource: false,
  showProvider: false,
  showAppointmentStatus: false,
  showTimeRange: false,
  showDob: false,
  showChartNumber: false,
  showReason: false,
  showNotes: false,
} satisfies AppointmentBlockDisplay;

export type AppointmentBlockColorMode =
  (typeof APPOINTMENT_BLOCK_COLOR_MODE_OPTIONS)[number]["value"];

export type AppointmentBlockDisplay = {
  colorMode: AppointmentBlockColorMode;
  showStatusChip: boolean;
  showVisitType: boolean;
  showRoom: boolean;
  showResource: boolean;
  showProvider: boolean;
  showAppointmentStatus: boolean;
  showTimeRange: boolean;
  showDob: boolean;
  showChartNumber: boolean;
  showReason: boolean;
  showNotes: boolean;
};

export const APPOINTMENT_BLOCK_DISPLAY_OPTIONS = [
  {
    key: "showStatusChip",
    label: "Color chip",
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
    key: "showAppointmentStatus",
    label: "Appointment status",
  },
  {
    key: "showTimeRange",
    label: "Time range",
  },
  {
    key: "showDob",
    label: "DOB",
  },
  {
    key: "showChartNumber",
    label: "Chart #",
  },
  {
    key: "showReason",
    label: "Reason",
  },
  {
    key: "showNotes",
    label: "Note",
  },
];

export const APPOINTMENT_BLOCK_COLOR_MODE_OPTIONS = [
  {
    value: "visitBlockStatusChip",
    label: "Visit block",
    chipLabel: "Status chip",
  },
  {
    value: "statusBlockVisitChip",
    label: "Status block",
    chipLabel: "Visit chip",
  },
] as const;

export function sanitizeAppointmentBlockColorMode(
  value: unknown
): AppointmentBlockColorMode {
  return APPOINTMENT_BLOCK_COLOR_MODE_OPTIONS.some(
    (option) => option.value === value
  )
    ? (value as AppointmentBlockColorMode)
    : DEFAULT_APPOINTMENT_BLOCK_DISPLAY.colorMode;
}

export function sanitizeAppointmentBlockDisplay(
  value: unknown
): AppointmentBlockDisplay {
  const nextValue =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    ...Object.fromEntries(
      Object.entries(DEFAULT_APPOINTMENT_BLOCK_DISPLAY)
        .filter(([, defaultValue]) => typeof defaultValue === "boolean")
        .map(([key, defaultValue]) => [
          key,
          typeof (nextValue as Record<string, unknown>)[key] === "boolean"
            ? (nextValue as Record<string, boolean>)[key]
            : defaultValue,
        ])
    ),
    colorMode: sanitizeAppointmentBlockColorMode(
      (nextValue as Record<string, unknown>).colorMode
    ),
  } as AppointmentBlockDisplay;
}
