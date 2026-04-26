import { useEffect, useState } from "react";

import { Input } from "../../../../shared/components/ui";
import {
  AdminField,
  AdminFormModal,
  AdminFormSection,
  AdminToggleField,
} from "../shared/AdminFormModal";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";

const OPERATING_DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];
const DEFAULT_OPERATING_DAYS = [1, 2, 3, 4, 5];

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
      description="Maintain facility identity, location, contact, and timezone details."
      maxWidth="4xl"
      formId="facility-form"
      saving={saving}
    >
      <form id="facility-form" onSubmit={handleSubmit} className="space-y-4">
        <AdminFormSection title="Identity">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Name">
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </AdminField>
            <AdminField label="Facility Code">
              <Input
                name="facility_code"
                value={formData.facility_code}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Timezone" className="md:col-span-2">
              <Input
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                required
              />
            </AdminField>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Schedule">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Start Time">
              <Input
                type="time"
                name="operating_start_time"
                value={formData.operating_start_time}
                onChange={handleChange}
                required
              />
            </AdminField>
            <AdminField label="End Time">
              <Input
                type="time"
                name="operating_end_time"
                value={formData.operating_end_time}
                onChange={handleChange}
                required
              />
            </AdminField>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-cf-text-subtle">
              Operating Days
            </div>
            <div className="grid grid-cols-7 gap-2">
              {OPERATING_DAY_OPTIONS.map((day) => {
                const isSelected = formData.operating_days.includes(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleOperatingDayToggle(day.value)}
                    className={[
                      "rounded-xl border px-2 py-2 text-sm font-semibold transition",
                      isSelected
                        ? "border-cf-accent bg-cf-accent text-white"
                        : "border-cf-border bg-cf-surface-muted text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
                    ].join(" ")}
                    aria-pressed={isSelected}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Contact">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminField label="Phone">
              <Input
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Fax">
              <Input
                name="fax_number"
                value={formData.fax_number}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Email">
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </AdminField>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Address">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Address Line 1" className="md:col-span-2">
              <Input
                name="line_1"
                value={formData.address.line_1}
                onChange={handleAddressChange}
              />
            </AdminField>
            <AdminField label="Address Line 2" className="md:col-span-2">
              <Input
                name="line_2"
                value={formData.address.line_2}
                onChange={handleAddressChange}
              />
            </AdminField>
            <AdminField label="City">
              <Input
                name="city"
                value={formData.address.city}
                onChange={handleAddressChange}
              />
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="State">
                <Input
                  as="select"
                  name="state"
                  value={formData.address.state}
                  onChange={handleAddressChange}
                >
                  {US_STATE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Input>
              </AdminField>
              <AdminField label="ZIP Code">
                <Input
                  name="zip_code"
                  value={formData.address.zip_code}
                  onChange={handleAddressChange}
                />
              </AdminField>
            </div>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Notes">
          <div className="space-y-4">
            <Input
              as="textarea"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Optional notes for admins and operations"
            />
            <AdminToggleField
              label="Active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
          </div>
        </AdminFormSection>
      </form>
    </AdminFormModal>
  );
}
