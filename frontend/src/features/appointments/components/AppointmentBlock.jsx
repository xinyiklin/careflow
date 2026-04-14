export default function AppointmentBlock({
  appointment,
  onDoubleClick,
  onPointerDragStart,
  isDragging = false,
}) {
  return (
    <div
      className={[
        "flex h-full min-w-0 flex-1 select-none items-center rounded-md border border-white px-2",
        isDragging ? "cursor-grabbing opacity-40" : "cursor-grab",
      ].join(" ")}
      style={{
        backgroundColor: appointment.status_color || "#ffffff",
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDragStart?.(e, appointment);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
    >
      <div
        className="mr-2 shrink-0 rounded-full"
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: appointment.appointment_type_color || "#ccc",
        }}
      />

      <div className="mr-2 min-w-0 truncate text-xs font-semibold text-slate-900">
        {appointment.patient_name}
      </div>

      <div className="min-w-0 flex-1 truncate text-xs text-slate-500">
        {appointment.appointment_type_name || ""}
      </div>
    </div>
  );
}