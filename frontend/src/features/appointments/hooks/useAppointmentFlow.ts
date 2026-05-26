import { useState, useCallback } from "react";
import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../shared/utils/dateTime";

import type { Dispatch, SetStateAction } from "react";
import type { EntityId } from "../../../shared/api/types";
import type {
  AppointmentLike,
  AppointmentStatusOption,
  AppointmentTypeOption,
  FacilityLike,
  ResourceRecord,
  StaffRecord,
} from "../../../shared/types/domain";

type AppointmentFormData = {
  patient: EntityId | "";
  resource: EntityId | "";
  rendering_provider: EntityId | "";
  rendering_provider_name: string;
  appointment_time: string;
  room: string;
  reason: string;
  notes: string;
  status: EntityId | "";
  appointment_type: EntityId | "";
  facility: EntityId | "";
  is_billable?: boolean;
};

type StaffOption = StaffRecord;

type ResourceOption = ResourceRecord;

type AppointmentOption = AppointmentStatusOption | AppointmentTypeOption;

type OpenAppointmentModalOptions = {
  mode: "create" | "edit" | "duplicate";
  appointment?: AppointmentLike | null;
  appointmentTime?: string | null;
  resourceId?: EntityId | "";
};

type UseAppointmentFlowOptions = {
  facility?: FacilityLike | null;
  physicians: StaffOption[];
  staffs?: StaffOption[];
  resources: ResourceOption[];
  statusOptions: AppointmentStatusOption[];
  typeOptions: AppointmentTypeOption[];
  selectedDate?: string;
};

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
  is_billable: true,
} satisfies AppointmentFormData;

function isRenderingProviderStaff(staff: StaffOption) {
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

function getDefaultResource(
  resources: ResourceOption[],
  resourceId: EntityId | "" = ""
) {
  if (resourceId) {
    const matchingResource = resources.find(
      (resource) => String(resource.id) === String(resourceId)
    );
    if (matchingResource) return matchingResource;
  }

  return resources[0] || null;
}

function getDefaultRenderingProvider(
  staffs: StaffOption[],
  resource: ResourceOption | null,
  physicians: StaffOption[]
) {
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

function normalizeOptionValue(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getDefaultStatusId(statusOptions: AppointmentOption[]) {
  const pendingStatus = statusOptions.find((option) => {
    return (
      normalizeOptionValue(option.code) === "pending" ||
      normalizeOptionValue(option.name) === "pending"
    );
  });

  return pendingStatus?.id || statusOptions[0]?.id || "";
}

function getCurrentFacilityAppointmentTime(
  facility: FacilityLike | null | undefined,
  selectedDate?: string
) {
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
}: UseAppointmentFlowOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [formData, setFormData] = useState<AppointmentFormData>(emptyForm);
  const [selectedPatient, setSelectedPatient] =
    useState<AppointmentLike | null>(null);

  const openModal = useCallback(
    ({
      mode,
      appointment = null,
      appointmentTime = null,
      resourceId = "",
    }: OpenAppointmentModalOptions) => {
      setEditingId(mode === "edit" ? appointment?.id || null : null);

      if ((mode === "edit" || mode === "duplicate") && appointment) {
        setSelectedPatient({
          id: appointment.patient_id ?? undefined,
          first_name: appointment.patient_first_name || "",
          middle_name: appointment.patient_middle_name || "",
          last_name: appointment.patient_last_name || "",
          preferred_name: appointment.patient_preferred_name || "",
          patient_name: appointment.patient_name || "",
          date_of_birth: appointment.patient_date_of_birth || "",
          chart_number: appointment.patient_chart_number || "",
        });

        setFormData({
          patient: appointment.patient_id || "",
          resource: appointment.resource || "",
          rendering_provider: appointment.rendering_provider || "",
          rendering_provider_name: appointment.rendering_provider_name || "",
          appointment_time: (appointment.appointment_time || "").slice(0, 16),
          room: appointment.room || "",
          reason: appointment.reason || "",
          notes: appointment.notes || "",
          status: appointment.status || "",
          appointment_type: appointment.appointment_type || "",
          facility: appointment.facility || "",
          is_billable: appointment.is_billable ?? true,
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
          appointment_type:
            typeOptions.length > 0 ? typeOptions[0].id || "" : "",
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
      openEdit: (appointment: AppointmentLike) =>
        openModal({ mode: "edit", appointment }),
      openDuplicate: (appointment: AppointmentLike) =>
        openModal({ mode: "duplicate", appointment }),
      openFromSlot: (
        date: string,
        time24: string,
        resourceId: EntityId | "" = ""
      ) =>
        openModal({
          mode: "create",
          appointmentTime: `${date}T${time24}`,
          resourceId,
        }),
    },

    selectedPatient,
    setSelectedPatient: setSelectedPatient as Dispatch<
      SetStateAction<AppointmentLike | null>
    >,
  };
}
