import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(intervalMinutes);
  }, [intervalMinutes]);

  const formattedSelectedDate = useMemo(() => {
    return dayjs(selectedDate).format("MMM D, YYYY");
  }, [selectedDate]);

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

  const getSlotIndexFromPointer = useCallback(
    (clientY) => {
      if (!dayViewRef.current) return null;

      const container = dayViewRef.current;
      const rect = container.getBoundingClientRect();
      const clampedY = Math.min(Math.max(clientY, rect.top), rect.bottom - 1);
      const relativeVisibleY = clampedY - rect.top;
      const relativeScrolledY = relativeVisibleY + container.scrollTop;

      const slotElements = container.querySelectorAll("[data-slot-index]");
      if (!slotElements.length) return null;

      const firstSlot = slotElements[0];
      const slotHeight = firstSlot.getBoundingClientRect().height;

      const slotIndex = Math.floor(relativeScrolledY / slotHeight);

      return Math.min(Math.max(slotIndex, 0), timeSlots.length - 1);
    },
    [timeSlots]
  );

  const handlePointerDragStart = (e, appointment) => {
    if (!dayViewRef.current) return;

    e.preventDefault();

    const slotIndex = timeSlots.findIndex(
      (slot) => slot.time24 === appointment.time
    );

    setDragState({
      appointment,
      originalTime: appointment.time,
      originalDate: appointment.date,
      hoverSlotIndex: slotIndex >= 0 ? slotIndex : 0,
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
        onAppointmentDrop?.(
          selectedDate,
          targetSlot.time24,
          dragState.appointment
        );
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
  }, [
    dragState,
    onAppointmentDrop,
    selectedDate,
    timeSlots,
    getSlotIndexFromPointer,
  ]);

  const appointmentsBySlot = useMemo(() => {
    const map = new Map();

    appointmentsForDay.forEach((a) => {
      const [h, m] = a.time.split(":").map(Number);
      const minutes = h * 60 + m;

      const slotIndex = Math.floor(minutes / intervalMinutes);

      if (!map.has(slotIndex)) {
        map.set(slotIndex, []);
      }

      map.get(slotIndex).push(a);
    });

    return map;
  }, [appointmentsForDay, intervalMinutes]);

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-2">
          <div className="flex items-center justify-center gap-2 select-none">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => changeDay(-1)}
              aria-label="Previous day"
              title="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="min-w-[110px] px-1 text-center text-sm font-medium text-slate-700">
              {formattedSelectedDate}
            </div>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => changeDay(1)}
              aria-label="Next day"
              title="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setIsDatePickerOpen(true)}
              aria-label="Open calendar"
              title="Open calendar"
            >
              <CalendarDays className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="inline-flex h-8 items-center justify-center rounded-md px-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => onDateChange(getTodayLocal())}
            >
              Today
            </button>

            <div className="absolute opacity-0 pointer-events-none">
              <DatePicker
                open={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                value={selectedDate ? dayjs(selectedDate) : null}
                onChange={(newValue) => {
                  if (newValue && newValue.isValid()) {
                    onDateChange(newValue.format("YYYY-MM-DD"));
                  }
                  setIsDatePickerOpen(false);
                }}
                slotProps={{
                  textField: {
                    size: "small",
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div ref={dayViewRef} className="max-h-[80vh] overflow-y-auto">
          {timeSlots.map((slot, slotIndex) => {
            const slotAppointments = appointmentsBySlot.get(slotIndex) || [];

            const previewAppointment =
              dragState &&
              dragState.hoverSlotIndex === slotIndex &&
              dragState.appointment.date === selectedDate
                ? dragState.appointment
                : null;

            return (
              <div
                key={slot.value}
                data-slot-index={slotIndex}
                className="flex min-h-[28px] border-b border-slate-200 last:border-b-0"
              >
                <div className="w-[100px] shrink-0 select-none border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">
                  {slot.label}
                </div>

                <div
                  className="flex flex-1 gap-1 px-2 py-0.5"
                  onDoubleClick={() =>
                    onSlotDoubleClick?.(selectedDate, slot.time24)
                  }
                >
                  {slotAppointments.map((a) => {
                    const isDraggingCurrent =
                      dragState?.appointment.id === a.id;

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
                    !slotAppointments.some(
                      (a) => a.id === previewAppointment.id
                    ) && (
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
                                previewAppointment.appointment_type_color ||
                                "#ccc",
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
    </div>
  );
}
