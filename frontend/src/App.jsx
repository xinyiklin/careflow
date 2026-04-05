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
  status: "pending",
};

function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

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
    fetchAppointments(selectedDate, false);
  }, [selectedDate]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      appointment_time: `${selectedDate}T09:00`,
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
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleSlotDoubleClick = (date, time24) => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      appointment_time: `${date}T${time24}`,
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

    try {
      if (editingId) {
        await axios.put(`${API_URL}${editingId}/`, formData, {
          withCredentials: true,
        });
      } else {
        await axios.post(API_URL, formData, {
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

  const formattedAppointments = appointments.map((appointment) => ({
    id: appointment.id,
    patient_name: appointment.patient_name,
    doctor_name: appointment.doctor_name,
    reason: appointment.reason,
    status: appointment.status,
    created_by_name: appointment.created_by_name,
    appointment_time: appointment.appointment_time,
    date: extractStoredDate(appointment.appointment_time),
    time: extractStoredTime(appointment.appointment_time),
    onEdit: () => openEditModal(appointment),
  }));

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Clinic Scheduler</h1>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
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
        />
      )}

      <AppointmentFormModal
        isOpen={isModalOpen}
        mode={editingId ? "edit" : "create"}
        formData={formData}
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