import { Button } from "../../../shared/components/ui";
import type { BookingState } from "../utils/bookingSession";

export default function AppointmentBookingNotice({
  state,
  timeZone,
  onRetry,
  onTakeOver,
  allowTakeOver,
}: {
  state: BookingState;
  timeZone?: string | null;
  onRetry: () => void;
  onTakeOver: () => void;
  allowTakeOver: boolean;
}) {
  const range = (start: string, end: string) => {
    try {
      return `${new Intl.DateTimeFormat("en-US", { timeZone: timeZone || "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(start))}–${new Intl.DateTimeFormat("en-US", { timeZone: timeZone || "UTC", hour: "numeric", minute: "2-digit" }).format(new Date(end))}`;
    } catch {
      return "the selected time";
    }
  };
  const conflict = state.response?.conflicts[0];
  const holders = state.response?.holders || [];
  const lost =
    allowTakeOver &&
    ["revoked", "released", "available"].includes(state.response?.status || "");
  return (
    <div
      className="min-h-10 space-y-1 text-xs text-cf-text-muted"
      aria-live="polite"
      aria-atomic="true"
    >
      {state.error ? (
        <div className="flex items-center justify-between gap-3">
          <span>{state.error}</span>
          <Button size="sm" type="button" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      {conflict ? (
        <p className="text-cf-warning-text">
          This time overlaps an existing appointment (
          {range(conflict.start_time, conflict.end_time)}).
        </p>
      ) : null}
      {holders.length ? (
        <div className="flex items-center justify-between gap-3">
          <span>
            {holders.length === 1
              ? holders[0].user_name
              : `${holders.length} schedulers`}{" "}
            {holders.length === 1 ? "is" : "are"} booking overlapping time.
          </span>
          {allowTakeOver ? (
            <Button
              type="button"
              size="sm"
              variant="warning"
              onClick={onTakeOver}
            >
              Take over
            </Button>
          ) : null}
        </div>
      ) : null}
      {lost && !holders.length ? (
        <div className="flex items-center justify-between gap-3">
          <span>Booking presence is no longer active.</span>
          <Button type="button" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
