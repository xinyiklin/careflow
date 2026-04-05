export default function AppointmentFormModal({
  isOpen,
  mode = "create",
  formData,
  error,
  onChange,
  onSubmit,
  onClose,
  onDelete,
}) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 1040,
        }}
        onClick={onClose}
      />

      <div
        className="position-fixed top-50 start-50 translate-middle w-100 px-3"
        style={{ maxWidth: "600px", zIndex: 1050 }}
      >
        <div className="card shadow-lg">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h4 mb-0">
                {mode === "edit" ? "Edit Appointment" : "Create Appointment"}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={onSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Patient Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="patient_name"
                    value={formData.patient_name}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Doctor Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="doctor_name"
                    value={formData.doctor_name}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Appointment Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    name="appointment_time"
                    value={formData.appointment_time}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={onChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="check_in">Check In</option>
                    <option value="check_out">Check Out</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-control"
                    name="reason"
                    rows="3"
                    value={formData.reason}
                    onChange={onChange}
                  />
                </div>

                <div className="col-12 d-flex justify-content-between gap-2">
                  <div>
                    {mode === "edit" && (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={onDelete}
                      >
                        Delete Appointment
                      </button>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onClose}
                    >
                      Cancel
                    </button>

                    <button type="submit" className="btn btn-primary">
                      {mode === "edit" ? "Update Appointment" : "Create Appointment"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}