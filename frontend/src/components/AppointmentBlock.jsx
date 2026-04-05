export default function AppointmentBlock({ appointment, onDoubleClick }) {
  return (
    <div
      className="card mb-1 mx-2"
      style={{ cursor: "pointer" }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      <div className="card-body py-1 px-2 d-flex align-items-center">

        <div className="fw-semibold small w-auto me-2">
          {appointment.patient_name}
        </div>

        <div className="text-muted small text-truncate flex-grow-1 text-start">
          {appointment.reason || "Follow up"}
        </div>

      </div>
    </div>
  );
}