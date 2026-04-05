import { useEffect, useState } from "react";
import axios from "axios";
import SchedulerDayView from "./components/SchedulerDayView";
import {
  getTodayLocal,
  extractStoredDate,
  extractStoredTime,
} from "./utils/dateTime";

axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "X-CSRFToken";

const API_URL = "/api/appointments/";

function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());

  const fetchAppointments = async (date = selectedDate) => {
    try {
      setLoading(true);

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
    fetchAppointments(selectedDate);
  }, [selectedDate]);

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
  }));

  return (
    <div className="container py-4">
      <h1 className="mb-4">Clinic Scheduler</h1>

      {!loading && !error && (
        <SchedulerDayView
          appointments={formattedAppointments}
          intervalMinutes={15}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}
    </div>
  );
}

export default App;