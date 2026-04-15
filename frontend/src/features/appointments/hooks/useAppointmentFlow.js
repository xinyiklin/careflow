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

  const openAppointmentDetail = ({
    mode,
    appointment = null,
    appointmentTime = null,
  }) => {
    setEditingId(mode === "edit" ? appointment?.id : null);

    if (mode === "edit" && appointment) {
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
    } else {
      setSelectedPatient(null);
      setFormData({
        ...emptyForm,
        facility: facility?.id || "",
        doctor_name: physicians.length === 1 ? physicians[0].name : "",
        appointment_time: appointmentTime || `${selectedDate}T09:00`,
        status: statusOptions.length > 0 ? statusOptions[0].id : "",
        appointment_type: typeOptions.length > 0 ? typeOptions[0].id : "",
      });
    }
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    openAppointmentDetail({ mode: "create" });
  };

  const openCreateFromSlot = (date, time24) => {
    openAppointmentDetail({
      mode: "create",
      appointmentTime: `${date}T${time24}`,
    });
  };

  const openEditModal = (appointment) => {
    openAppointmentDetail({ mode: "edit", appointment });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setSelectedPatient(null);
  };

  return {
    modal: {
      isOpen: isModalOpen,
      editingId,
      formData,
      mode: editingId ? "edit" : "create",
      open: openAppointmentDetail,
      close: closeModal,
      openCreate: () => openAppointmentDetail({ mode: "create" }),
      openEdit: (appointment) =>
        openAppointmentDetail({ mode: "edit", appointment }),
      openFromSlot: (date, time24) =>
        openAppointmentDetail({
          mode: "create",
          appointmentTime: `${date}T${time24}`,
        }),
    },

    selectedPatient,
    setSelectedPatient,
  };
}
