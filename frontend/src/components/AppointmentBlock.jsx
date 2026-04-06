export default function AppointmentBlock({
  appointment,
  onDoubleClick,
  onDragStart,
}) {
  return (
    <div
      className="card"
      draggable
      style={{
        flex: "1 1 0",
        minWidth: 0,
        cursor: "grab",
        backgroundColor: appointment.status_color || "#ffffff",
        border: "1px solid #ffffff",
      }}
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart?.(appointment);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      <div className="card-body py-1 px-2 d-flex align-items-center">
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: appointment.appointment_type_color || "#ccc",
            marginRight: "6px",
            flexShrink: 0,
          }}
        />

        <div
          className="fw-semibold small me-2 text-truncate"
          style={{ minWidth: 0 }}
        >
          {appointment.patient_name}
        </div>

        <div
          className="text-muted small text-truncate flex-grow-1 text-start"
          style={{ minWidth: 0 }}
        >
          {appointment.appointment_type_name || ""}
        </div>
      </div>
    </div>
  );
}