import { useState } from "react";

const emptyForm = {
  patient: "",
  doctor_name: "",
  appointment_time: "",
  reason: "",
  status: "",
  appointment_type: "",
  facility: "",
};

export default function useAppointmentFlow({
  facility,
  physicians,
  statusOptions,
  typeOptions,
  selectedDate,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const openCreateModal = () => {
    setEditingId(null);
    setSelectedPatient(null);
    setFormData({
      ...emptyForm,
      facility: facility?.id || "",
      doctor_name: physicians.length === 1 ? physicians[0].name : "",
      appointment_time: `${selectedDate}T09:00`,
      status: statusOptions.length > 0 ? statusOptions[0].id : "",
      appointment_type: typeOptions.length > 0 ? typeOptions[0].id : "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (appointment) => {
    setEditingId(appointment.id);

    setSelectedPatient({
      id: appointment.patient_id,
      full_name: appointment.patient_name,
      display_name: appointment.patient_name,
      date_of_birth: appointment.patient_date_of_birth || "",
      chart_number: appointment.patient_chart_number || "",
    });

    setFormData({
      patient: appointment.patient_id,
      doctor_name: appointment.doctor_name,
      appointment_time: appointment.appointment_time.slice(0, 16),
      reason: appointment.reason || "",
      status: appointment.status,
      appointment_type: appointment.appointment_type,
      facility: appointment.facility,
    });

    setIsModalOpen(true);
  };

  const openCreateFromSlot = (date, time24) => {
    setEditingId(null);
    setSelectedPatient(null);
    setFormData({
      ...emptyForm,
      facility: facility?.id || "",
      doctor_name: physicians.length === 1 ? physicians[0].name : "",
      appointment_time: `${date}T${time24}`,
      status: statusOptions.length > 0 ? statusOptions[0].id : "",
      appointment_type: typeOptions.length > 0 ? typeOptions[0].id : "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setSelectedPatient(null);
  };

  return {
    isModalOpen,
    editingId,
    formData,
    selectedPatient,
    setSelectedPatient,
    openCreateModal,
    openEditModal,
    openCreateFromSlot,
    closeModal,
  };
}