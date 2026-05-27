export type TimeSlot = {
  value: number;
  label: string;
  time24: string;
};

export function generateTimeSlots(
  intervalMinutes = 15,
  startMinute = 0,
  endMinute = 24 * 60
): TimeSlot[] {
  const allowedIntervals = [5, 10, 15, 20, 30, 60];
  const safeInterval = allowedIntervals.includes(intervalMinutes)
    ? intervalMinutes
    : 15;

  const slots: TimeSlot[] = [];
  const safeStartMinute = Math.max(0, Math.min(startMinute, 24 * 60));
  const safeEndMinute = Math.max(
    safeStartMinute + safeInterval,
    Math.min(endMinute, 24 * 60)
  );

  for (
    let minutes = safeStartMinute;
    minutes < safeEndMinute;
    minutes += safeInterval
  ) {
    const hour = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const displayHour = String(hour % 12 === 0 ? 12 : hour % 12).padStart(
      2,
      "0"
    );
    const ampm = hour < 12 ? "AM" : "PM";

    slots.push({
      value: minutes,
      label: `${displayHour}:${String(mins).padStart(2, "0")} ${ampm}`,
      time24: `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
    });
  }

  return slots;
}
