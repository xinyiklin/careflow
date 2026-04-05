import { FaEdit, FaTrash } from "react-icons/fa";

export default function AppointmentBlock({ appointment, onEdit, onDelete }) {
  return (
    <div className="card mb-1 h-100">
      <div className="card-body py-1 px-2 d-flex justify-content-between align-items-start">
        
        {/* Left side: info */}
        <div>
          <div className="fw-semibold small">
            {appointment.patient_name}
          </div>

          {/* Optional: show doctor or status later */}
          {/* <div className="text-muted small">{appointment.doctor_name}</div> */}
        </div>

        {/* Right side: actions */}
        <div className="d-flex gap-1">
          <button
            className="btn btn-outline-warning btn-sm py-0 px-1"
            onClick={onEdit}
          >
            <FaEdit size={12} />
          </button>

          <button
            className="btn btn-outline-danger btn-sm py-0 px-1"
            onClick={onDelete}
          >
            <FaTrash size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}