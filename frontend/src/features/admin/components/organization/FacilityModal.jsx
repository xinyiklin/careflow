import { useEffect, useState } from "react";

import { AdminFormModal } from "../shared/AdminFormModal";
import { CompactModalGrid } from "../shared/AdminCompactModal";
import {
  DEFAULT_OPERATING_DAYS,
  FacilityDetailsLane,
  FacilityIdentityLane,
  OPERATING_DAY_OPTIONS,
} from "./FacilityModalSections";

const DEFAULT_FORM = {
  name: "",
  facility_code: "",
  timezone: "America/New_York",
  operating_start_time: "08:00",
  operating_end_time: "17:00",
  operating_days: DEFAULT_OPERATING_DAYS,
  phone_number: "",
  fax_number: "",
  email: "",
  notes: "",
  is_active: true,
  address: { line_1: "", line_2: "", city: "", state: "NY", zip_code: "" },
};

function normalizeAddress(address) {
  if (!address) return DEFAULT_FORM.address;
  return {
    line_1: address.line_1 || "",
    line_2: address.line_2 || "",
    city: address.city || "",
    state: address.state || "NY",
    zip_code: address.zip_code || "",
  };
}

function normalizeTimeInput(value, fallback) {
  return typeof value === "string" && value ? value.slice(0, 5) : fallback;
}

function normalizeOperatingDays(value) {
  if (!Array.isArray(value)) return DEFAULT_OPERATING_DAYS;
  const days = value
    .map((day) => Number(day))
    .filter(
      (day, index, allDays) =>
        day >= 1 && day <= 7 && allDays.indexOf(day) === index
    );
  return days.length ? days : DEFAULT_OPERATING_DAYS;
}

function getFacilityInitials(name) {
  return (
    name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "FC"
  );
}

function formatOperatingDays(days) {
  const normalizedDays = normalizeOperatingDays(days);
  if (normalizedDays.length === 7) return "Daily";
  if (normalizedDays.join(",") === "1,2,3,4,5") return "Mon-Fri";
  return OPERATING_DAY_OPTIONS.filter((option) =>
    normalizedDays.includes(option.value)
  )
    .map((option) => option.label)
    .join(", ");
}

export default function FacilityModal({
  isOpen,
  mode = "create",
  initialValues = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setFormData({
        name: initialValues.name || "",
        facility_code: initialValues.facility_code || "",
        timezone: initialValues.timezone || "America/New_York",
        operating_start_time: normalizeTimeInput(
          initialValues.operating_start_time,
          "08:00"
        ),
        operating_end_time: normalizeTimeInput(
          initialValues.operating_end_time,
          "17:00"
        ),
        operating_days: normalizeOperatingDays(initialValues.operating_days),
        phone_number: initialValues.phone_number || "",
        fax_number: initialValues.fax_number || "",
        email: initialValues.email || "",
        notes: initialValues.notes || "",
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
        address: normalizeAddress(initialValues.address),
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [initialValues, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  const handleOperatingDayToggle = (day) => {
    setFormData((prev) => {
      const currentDays = normalizeOperatingDays(prev.operating_days);
      const nextDays = currentDays.includes(day)
        ? currentDays.filter((currentDay) => currentDay !== day)
        : [...currentDays, day];

      return {
        ...prev,
        operating_days: nextDays.sort((left, right) => left - right),
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({
      ...formData,
      name: formData.name.trim(),
      facility_code: formData.facility_code.trim(),
      operating_start_time: formData.operating_start_time,
      operating_end_time: formData.operating_end_time,
      operating_days: normalizeOperatingDays(formData.operating_days),
      phone_number: formData.phone_number.trim(),
      fax_number: formData.fax_number.trim(),
      email: formData.email.trim(),
      notes: formData.notes.trim(),
      address: formData.address.line_1.trim()
        ? {
            line_1: formData.address.line_1.trim(),
            line_2: formData.address.line_2.trim(),
            city: formData.address.city.trim(),
            state: formData.address.state,
            zip_code: formData.address.zip_code.trim(),
          }
        : null,
    });
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization admin"
      title={mode === "edit" ? "Edit Facility" : "New Facility"}
      maxWidth="4xl"
      formId="facility-form"
      saving={saving}
    >
      <form id="facility-form" onSubmit={handleSubmit}>
        <CompactModalGrid>
          <FacilityIdentityLane
            formData={formData}
            initials={getFacilityInitials(formData.name)}
            daysLabel={formatOperatingDays(formData.operating_days)}
            onChange={handleChange}
            onDayToggle={handleOperatingDayToggle}
          />
          <FacilityDetailsLane
            formData={formData}
            daysLabel={formatOperatingDays(formData.operating_days)}
            onChange={handleChange}
            onAddressChange={handleAddressChange}
          />
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
