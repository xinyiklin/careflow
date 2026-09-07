import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { parse, parseISO } from "date-fns";
import { facilityWallText } from "./appointmentCandidate";

// Picker values represent facility wall-clock components, not instants. UTC
// component access avoids the host browser normalizing its own DST gaps.
// date-fns preserves Date subclasses throughout calendar arithmetic.
export class AppointmentPickerDate extends Date {
  getFullYear() {
    return this.getUTCFullYear();
  }
  getMonth() {
    return this.getUTCMonth();
  }
  getDate() {
    return this.getUTCDate();
  }
  getDay() {
    return this.getUTCDay();
  }
  getHours() {
    return this.getUTCHours();
  }
  getMinutes() {
    return this.getUTCMinutes();
  }
  getSeconds() {
    return this.getUTCSeconds();
  }
  getMilliseconds() {
    return this.getUTCMilliseconds();
  }
  getTimezoneOffset() {
    return 0;
  }
  setFullYear(...args: Parameters<Date["setFullYear"]>) {
    return this.setUTCFullYear(...args);
  }
  setMonth(...args: Parameters<Date["setMonth"]>) {
    return this.setUTCMonth(...args);
  }
  setDate(...args: Parameters<Date["setDate"]>) {
    return this.setUTCDate(...args);
  }
  setHours(...args: Parameters<Date["setHours"]>) {
    return this.setUTCHours(...args);
  }
  setMinutes(...args: Parameters<Date["setMinutes"]>) {
    return this.setUTCMinutes(...args);
  }
  setSeconds(...args: Parameters<Date["setSeconds"]>) {
    return this.setUTCSeconds(...args);
  }
  setMilliseconds(...args: Parameters<Date["setMilliseconds"]>) {
    return this.setUTCMilliseconds(...args);
  }
}

export function restorePickerDate(value: Date | null | undefined) {
  return value ? new AppointmentPickerDate(value.getTime()) : value;
}

export function appointmentPickerDate(
  value: string | Date | null | undefined,
  timeZone?: string | null
): Date | null {
  if (!value) return null;
  try {
    const wall =
      value instanceof Date || /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
        ? facilityWallText(value, timeZone || "UTC")
        : value;
    return parseISO(wall, { in: (date) => new AppointmentPickerDate(date) });
  } catch {
    return new AppointmentPickerDate(NaN);
  }
}

export function appointmentPickerAdapter(timeZone: string) {
  return class FacilityWallClockAdapter extends AdapterDateFns {
    date = ((value?: string | null) =>
      value === null
        ? null
        : value === undefined
          ? appointmentPickerDate(new Date(), timeZone)
          : parseISO(value, {
              in: (date) => new AppointmentPickerDate(date),
            })) as AdapterDateFns["date"];
    getInvalidDate = () => new AppointmentPickerDate(NaN);
    parse = (value: string, pattern: string) =>
      value === ""
        ? null
        : parse(value, pattern, this.date(), { locale: this.locale });
  };
}
