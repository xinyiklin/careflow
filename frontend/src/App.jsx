import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";
import SchedulerDayView from "./components/SchedulerDayView";
import AppointmentFormModal from "./components/AppointmentFormModal";
import {
  getTodayLocal,
  extractStoredDate,
  extractStoredTime,
} from "./utils/dateTime";

axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "X-CSRFToken";

const API_URL = "/api/appointments/";

const emptyForm = {
  patient_name: "",
  doctor_name: "",
  appointment_time: "",
  reason: "",
  status: "",
  appointment_type: "",
  facility: "",
};

function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());

  const [facility, setFacility] = useState(null);
  const [role, setRole] = useState(null);

  const [physicians, setPhysicians] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [draggedAppointment, setDraggedAppointment] = useState(null);

  const fetchUser = async () => {
    try {
      const res = await axios.get("/api/me/", {
        withCredentials: true,
      });

      setFacility(res.data.facility || null);
      setRole(res.data.role || null);
      setError("");
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to load user info.");
    }
  };

  const fetchPhysicians = async () => {
    try {
      const res = await axios.get("/api/physicians/", {
        withCredentials: true,
      });
      setPhysicians(res.data);
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to load physicians.");
    }
  };

  const fetchStatusOptions = async () => {
    try {
      const res = await axios.get("/api/appointment-statuses/", {
        withCredentials: true,
      });
      setStatusOptions(res.data);
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to load appointment statuses.");
    }
  };

  const fetchTypeOptions = async () => {
    try {
      const res = await axios.get("/api/appointment-types/", {
        withCredentials: true,
      });
      setTypeOptions(res.data);
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to load appointment types.");
    }
  };

  const fetchAppointments = async (date = selectedDate, silent = false) => {
    try {
      if (!silent) setLoading(true);

      const res = await axios.get(`${API_URL}?date=${date}`, {
        withCredentials: true,
      });

      setAppointments(res.data);
      setError("");
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (facility) {
      fetchPhysicians();
      fetchStatusOptions();
      fetchTypeOptions();
    }
  }, [facility]);

  useEffect(() => {
    if (facility) {
      fetchAppointments(selectedDate, false);
    }
  }, [selectedDate, facility]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      facility: facility?.id || "",
      doctor_name: physicians.length === 1 ? physicians[0].name : "",
      appointment_time: `${selectedDate}T09:00`,
      status: statusOptions.length > 0 ? statusOptions[0].id : "",
      appointment_type: typeOptions.length > 0 ? typeOptions[0].id : "",
    });
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (appointment) => {
    setEditingId(appointment.id);
    setFormData({
      patient_name: appointment.patient_name,
      doctor_name: appointment.doctor_name,
      appointment_time: appointment.appointment_time.slice(0, 16),
      reason: appointment.reason || "",
      status: appointment.status,
      appointment_type: appointment.appointment_type,
      facility: appointment.facility,
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleSlotDoubleClick = (date, time24) => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      facility: facility?.id || "",
      doctor_name: physicians.length === 1 ? physicians[0].name : "",
      appointment_time: `${date}T${time24}`,
      status: statusOptions.length > 0 ? statusOptions[0].id : "",
      appointment_type: typeOptions.length > 0 ? typeOptions[0].id : "",
    });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      status: formData.status ? Number(formData.status) : "",
      appointment_type: formData.appointment_type
        ? Number(formData.appointment_type)
        : "",
      facility: formData.facility ? Number(formData.facility) : "",
    };

    try {
      if (editingId) {
        await axios.put(`${API_URL}${editingId}/`, payload, {
          withCredentials: true,
        });
      } else {
        await axios.post(API_URL, payload, {
          withCredentials: true,
        });
      }

      await fetchAppointments(selectedDate, true);
      closeModal();
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to save appointment.");
    }
  };

  const handleModalDelete = async () => {
    if (!editingId) return;

    if (!window.confirm("Are you sure you want to delete this appointment?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}${editingId}/`, {
        withCredentials: true,
      });
      await fetchAppointments(selectedDate, true);
      closeModal();
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to delete appointment.");
    }
  };

  const handleDragStartAppointment = (appointment) => {
    setDraggedAppointment(appointment);
  };

  const handleDropAppointment = async (date, time24) => {
    if (!draggedAppointment) return;

    const payload = {
      patient_name: draggedAppointment.patient_name,
      doctor_name: draggedAppointment.doctor_name,
      appointment_time: `${date}T${time24}`,
      reason: draggedAppointment.reason || "",
      status: draggedAppointment.status,
      appointment_type: draggedAppointment.appointment_type,
      facility: draggedAppointment.facility,
    };

    try {
      await axios.put(`${API_URL}${draggedAppointment.id}/`, payload, {
        withCredentials: true,
      });

      setDraggedAppointment(null);
      await fetchAppointments(selectedDate, true);
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Failed to move appointment.");
    }
  };

  const formattedAppointments = appointments.map((appointment) => ({
    id: appointment.id,
    patient_name: appointment.patient_name,
    doctor_name: appointment.doctor_name,
    reason: appointment.reason,
    status: appointment.status,
    status_name: appointment.status_name,
    status_code: appointment.status_code,
    status_color: appointment.status_color,
    appointment_type: appointment.appointment_type,
    appointment_type_name: appointment.appointment_type_name,
    appointment_type_code: appointment.appointment_type_code,
    appointment_type_color: appointment.appointment_type_color,
    facility: appointment.facility,
    created_by_name: appointment.created_by_name,
    appointment_time: appointment.appointment_time,
    date: extractStoredDate(appointment.appointment_time),
    time: extractStoredTime(appointment.appointment_time),
    onEdit: () => openEditModal(appointment),
  }));

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-0">{facility?.name || "Facility Scheduler"}</h1>
          {role && <small className="text-muted">Role: {role}</small>}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
          disabled={!facility}
        >
          Add Appointment
        </button>
      </div>

      {loading && appointments.length === 0 && <p>Loading appointments...</p>}
      {error && !isModalOpen && <div className="alert alert-danger">{error}</div>}

      {(appointments.length > 0 || !loading) && (
        <SchedulerDayView
          appointments={formattedAppointments}
          intervalMinutes={15}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSlotDoubleClick={handleSlotDoubleClick}
          onAppointmentDragStart={handleDragStartAppointment}
          onAppointmentDrop={handleDropAppointment}
        />
      )}

      <AppointmentFormModal
        isOpen={isModalOpen}
        mode={editingId ? "edit" : "create"}
        formData={formData}
        physicians={physicians}
        statusOptions={statusOptions}
        typeOptions={typeOptions}
        error={error}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        onDelete={handleModalDelete}
      />
    </div>
  );
}

export default App;