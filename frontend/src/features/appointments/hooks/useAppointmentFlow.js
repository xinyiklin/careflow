import { useState, useCallback } from "react";
import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../shared/utils/dateTime";

const emptyForm = {
  patient: "",
  resource: "",
  rendering_provider: "",
  rendering_provider_name: "",
  appointment_time: "",
  room: "",
  reason: "",
  notes: "",
  status: "",
  appointment_type: "",
  facility: "",
};

function isRenderingProviderStaff(staff) {
  if (!staff?.is_active) return false;
  if (staff.can_render_claims) return true;

  const roleCode = String(
    staff.role_code || staff.role_name || ""
  ).toLowerCase();
  const titleCode = String(
    staff.title_code || staff.title_name || ""
  ).toLowerCase();

  return (
    roleCode === "physician" ||
    ["md", "do", "np", "pa", "cnm", "cns", "crna"].includes(titleCode)
  );
}

function getDefaultResource(resources, resourceId = "") {
  if (resourceId) {
    const matchingResource = resources.find(
      (resource) => String(resource.id) === String(resourceId)
    );
    if (matchingResource) return matchingResource;
  }

  return resources[0] || null;
}

function getDefaultRenderingProvider(staffs, resource, physicians) {
  const eligibleProviders = staffs.filter(isRenderingProviderStaff);

  if (resource?.linked_staff) {
    const linkedProvider = eligibleProviders.find(
      (staff) => String(staff.id) === String(resource.linked_staff)
    );
    if (linkedProvider) return linkedProvider;
  }

  if (eligibleProviders.length === 1) return eligibleProviders[0];
  if (physicians.length === 1) return physicians[0];

  return null;
}

function normalizeOptionValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getDefaultStatusId(statusOptions) {
  const pendingStatus = statusOptions.find((option) => {
    return (
      normalizeOptionValue(option.code) === "pending" ||
      normalizeOptionValue(option.name) === "pending"
    );
  });

  return pendingStatus?.id || statusOptions[0]?.id || "";
}

function getCurrentFacilityAppointmentTime(facility, selectedDate) {
  if (!facility?.timezone) {
    return selectedDate ? `${selectedDate}T09:00` : "";
  }

  const now = new Date();
  const date = formatDateOnlyInTimeZone(now, facility.timezone, "yyyy-MM-dd");
  const time = formatTimeInTimeZone(now, facility.timezone, "HH:mm");

  return date && time ? `${date}T${time}` : "";
}

export default function useAppointmentFlow({
  facility,
  physicians,
  staffs = [],
  resources,
  statusOptions,
  typeOptions,
  selectedDate,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const openModal = useCallback(
    ({ mode, appointment = null, appointmentTime = null, resourceId = "" }) => {
      setEditingId(mode === "edit" ? appointment?.id : null);

      if ((mode === "edit" || mode === "duplicate") && appointment) {
        setSelectedPatient({
          id: appointment.patient_id,
          full_name: appointment.patient_name,
          display_name: appointment.patient_name,
          date_of_birth: appointment.patient_date_of_birth || "",
          chart_number: appointment.patient_chart_number || "",
        });

        setFormData({
          patient: appointment.patient_id,
          resource: appointment.resource || "",
          rendering_provider: appointment.rendering_provider || "",
          rendering_provider_name: appointment.rendering_provider_name || "",
          appointment_time: appointment.appointment_time.slice(0, 16),
          room: appointment.room || "",
          reason: appointment.reason || "",
          notes: appointment.notes || "",
          status: appointment.status,
          appointment_type: appointment.appointment_type,
          facility: appointment.facility,
        });
      } else {
        const defaultResource = getDefaultResource(resources, resourceId);
        const defaultRenderingProvider = getDefaultRenderingProvider(
          staffs,
          defaultResource,
          physicians
        );

        setSelectedPatient(null);
        setFormData({
          ...emptyForm,
          facility: facility?.id || "",
          resource: defaultResource?.id || "",
          rendering_provider: defaultRenderingProvider?.id || "",
          room: defaultResource?.default_room || "",
          appointment_time:
            appointmentTime ||
            getCurrentFacilityAppointmentTime(facility, selectedDate),
          status: getDefaultStatusId(statusOptions),
          appointment_type: typeOptions.length > 0 ? typeOptions[0].id : "",
        });
      }

      setIsModalOpen(true);
    },
    [
      facility,
      physicians,
      resources,
      selectedDate,
      staffs,
      statusOptions,
      typeOptions,
    ]
  );

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
      open: openModal,
      close: closeModal,
      openCreate: (resourceId = "") =>
        openModal({ mode: "create", resourceId }),
      openEdit: (appointment) => openModal({ mode: "edit", appointment }),
      openDuplicate: (appointment) =>
        openModal({ mode: "duplicate", appointment }),
      openFromSlot: (date, time24, resourceId = "") =>
        openModal({
          mode: "create",
          appointmentTime: `${date}T${time24}`,
          resourceId,
        }),
    },

    selectedPatient,
    setSelectedPatient,
  };
}
