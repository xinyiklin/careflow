import { useEffect, useMemo, useRef, useState } from "react";
import { generateTimeSlots } from "../../../shared/utils/timeSlots";
import { getTodayLocal, parseLocalDate } from "../../../shared/utils/dateTime";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import AppointmentBlock from "./AppointmentBlock";

export default function SchedulerDayView({
  appointments,
  intervalMinutes = 15,
  selectedDate,
  onDateChange,
  onSlotDoubleClick,
  onAppointmentDrop,
}) {
  const dayViewRef = useRef(null);

  const [dragState, setDragState] = useState(null);

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

  const appointmentsForDay = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate);
  }, [appointments, selectedDate]);

  const getSlotIndexFromPointer = (clientY) => {
    if (!dayViewRef.current) return null;

    const rect = dayViewRef.current.getBoundingClientRect();
    const clampedY = Math.min(Math.max(clientY, rect.top), rect.bottom - 1);
    const relativeY = clampedY - rect.top;
    const slotHeight = rect.height / timeSlots.length;
    const slotIndex = Math.floor(relativeY / slotHeight);

    return Math.min(Math.max(slotIndex, 0), timeSlots.length - 1);
  };

  const handlePointerDragStart = (e, appointment) => {
    if (!dayViewRef.current) return;

    e.preventDefault();

    const slotIndex = timeSlots.findIndex((slot) => slot.time24 === appointment.time);

    setDragState({
      appointment,
      originalTime: appointment.time,
      originalDate: appointment.date,
      hoverSlotIndex: slotIndex >= 0 ? slotIndex : 0,
      pointerX: e.clientX,
      pointerY: e.clientY,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const handlePointerMove = (e) => {
      const slotIndex = getSlotIndexFromPointer(e.clientY);
      if (slotIndex == null) return;

      setDragState((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          hoverSlotIndex: slotIndex,
          pointerX: e.clientX,
          pointerY: e.clientY,
        };
      });
    };

    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (!dragState) return;

      const targetSlot = timeSlots[dragState.hoverSlotIndex];
      const didTimeChange = targetSlot?.time24 !== dragState.originalTime;

      if (didTimeChange && targetSlot) {
        onAppointmentDrop?.(selectedDate, targetSlot.time24, dragState.appointment);
      }

      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, onAppointmentDrop, selectedDate, timeSlots]);

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={() => changeDay(-1)}
        >
          Prev
        </button>

        <button
          type="button"
          className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          onClick={() => onDateChange(getTodayLocal())}
        >
          Today
        </button>

        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={() => changeDay(1)}
        >
          Next
        </button>

        <DatePicker
          value={selectedDate ? dayjs(selectedDate) : null}
          onChange={(newValue) => {
            if (newValue && newValue.isValid()) {
              onDateChange(newValue.format("YYYY-MM-DD"));
            }
          }}
          slotProps={{
            textField: {
              size: "small",
              sx: { width: 150 },
            },
          }}
        />
      </div>

      <div
        ref={dayViewRef}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {timeSlots.map((slot, slotIndex) => {
          const slotAppointments = appointmentsForDay.filter((a) => {
            const [h, m] = a.time.split(":").map(Number);
            const appointmentMinutes = h * 60 + m;

            return (
              appointmentMinutes >= slot.value &&
              appointmentMinutes < slot.value + intervalMinutes
            );
          });

          const previewAppointment =
            dragState &&
              dragState.hoverSlotIndex === slotIndex &&
              dragState.appointment.date === selectedDate
              ? dragState.appointment
              : null;

          return (
            <div
              key={slot.value}
              className="flex min-h-[28px] border-b border-slate-200 last:border-b-0"
            >
              <div className="w-[100px] shrink-0 select-none border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">
                {slot.label}
              </div>

              <div
                className="flex flex-1 gap-1 px-2 py-0.5"
                onDoubleClick={() => onSlotDoubleClick?.(selectedDate, slot.time24)}
              >
                {slotAppointments.map((a) => {
                  const isDraggingCurrent = dragState?.appointment.id === a.id;

                  return (
                    <AppointmentBlock
                      key={a.id}
                      appointment={a}
                      onDoubleClick={a.onEdit}
                      onPointerDragStart={handlePointerDragStart}
                      isDragging={isDraggingCurrent}
                    />
                  );
                })}

                {previewAppointment &&
                  !slotAppointments.some((a) => a.id === previewAppointment.id) && (
                    <div className="pointer-events-none flex min-w-0 flex-1">
                      <div
                        className="flex h-full min-w-0 flex-1 items-center rounded-md border border-dashed border-slate-400 px-2 opacity-80"
                        style={{
                          backgroundColor:
                            previewAppointment.status_color || "#ffffff",
                        }}
                      >
                        <div
                          className="mr-2 shrink-0 rounded-full"
                          style={{
                            width: "12px",
                            height: "12px",
                            backgroundColor:
                              previewAppointment.appointment_type_color || "#ccc",
                          }}
                        />

                        <div className="mr-2 min-w-0 truncate text-xs font-semibold text-slate-900">
                          {previewAppointment.patient_name}
                        </div>

                        <div className="min-w-0 flex-1 truncate text-xs text-slate-500">
                          {previewAppointment.appointment_type_name || ""}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}