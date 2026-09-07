import { useMemo } from "react";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import type { DateTimePickerProps } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  restorePickerDate,
  appointmentPickerAdapter,
} from "../utils/appointmentPicker";

export default function AppointmentDateTimePicker({
  facilityTimeZone,
  ...props
}: DateTimePickerProps<false> & { facilityTimeZone?: string | null }) {
  const adapter = useMemo(
    () => appointmentPickerAdapter(facilityTimeZone || "UTC"),
    [facilityTimeZone]
  );
  return (
    <LocalizationProvider dateAdapter={adapter}>
      <DateTimePicker
        {...props}
        // React Hook Form clones Date values into plain Dates. Reconstruct
        // the picker facade from the stored UTC wall-clock components.
        value={restorePickerDate(props.value)}
      />
    </LocalizationProvider>
  );
}
