import { useMemo } from "react";
import { generateTimeSlots } from "../utils/timeSlots";
import { getTodayLocal, parseLocalDate } from "../utils/dateTime";
import AppointmentBlock from "./AppointmentBlock";

export default function SchedulerDayView({
  appointments,
  intervalMinutes = 15,
  selectedDate,
  onDateChange,
  onSlotDoubleClick,
}) {
  const timeSlots = useMemo(() => {
    return generateTimeSlots(intervalMinutes);
  }, [intervalMinutes]);

  const changeDay = (offset) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + offset);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    onDateChange(`${year}-${month}-${day}`);
  };

  const appointmentsForDay = appointments.filter((a) => a.date === selectedDate);

  return (
    <div className="mt-4">
      <div className="d-flex gap-2 mb-3 align-items-center">
        <button
          className="btn btn-outline-secondary"
          onClick={() => changeDay(-1)}
        >
          Prev
        </button>

        <button
          className="btn btn-outline-primary"
          onClick={() => onDateChange(getTodayLocal())}
        >
          Today
        </button>

        <button
          className="btn btn-outline-secondary"
          onClick={() => changeDay(1)}
        >
          Next
        </button>

        <input
          type="date"
          className="form-control"
          style={{ maxWidth: "200px" }}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>

      <div className="border rounded">
        {timeSlots.map((slot) => {
          const slotAppointments = appointmentsForDay.filter((a) => {
            const [h, m] = a.time.split(":").map(Number);
            const appointmentMinutes = h * 60 + m;

            return (
              appointmentMinutes >= slot.value &&
              appointmentMinutes < slot.value + intervalMinutes
            );
          });

          return (
            <div
              key={slot.value}
              className="d-flex border-bottom"
              style={{ minHeight: "40px" }}
            >
              <div
                className="border-end px-2 py-1 bg-light"
                style={{ width: "100px", flexShrink: 0, userSelect: "none" }}
              >
                {slot.label}
              </div>

              <div
                className="flex-grow-1 px-2 py-1"
                style={{ cursor: "pointer" }}
                onDoubleClick={() =>
                  onSlotDoubleClick?.(selectedDate, slot.time24)
                }
              >
                {slotAppointments.map((a) => (
                  <AppointmentBlock
                    key={a.id}
                    appointment={a}
                    onDoubleClick={a.onEdit}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div >
  );
}