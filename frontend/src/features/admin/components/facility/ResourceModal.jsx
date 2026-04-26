import { useEffect, useState } from "react";

import { Input } from "../../../../shared/components/ui";
import {
  AdminField,
  AdminFormModal,
  AdminRecordPreview,
  AdminFormSection,
  AdminToggleField,
} from "../shared/AdminFormModal";
import {
  getResourceHoursLabel,
  getResourceRoomLabel,
} from "./resourceScheduleUtils";

const DEFAULT_FORM = {
  name: "",
  default_room: "",
  operating_start_time: "",
  operating_end_time: "",
  is_active: true,
};

export default function ResourceModal({
  isOpen,
  mode = "create",
  initialValues = null,
  facility = null,
  saving = false,
  onClose,
  onSubmit,
  onDelete,
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!isOpen) return;

    if (initialValues) {
      setFormData({
        name: initialValues.name || "",
        default_room: initialValues.default_room || "",
        operating_start_time: initialValues.operating_start_time || "",
        operating_end_time: initialValues.operating_end_time || "",
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [initialValues, isOpen]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({
      ...formData,
      name: formData.name.trim(),
      default_room: formData.default_room.trim(),
      operating_start_time: formData.operating_start_time || null,
      operating_end_time: formData.operating_end_time || null,
    });
  };

  const handleUseFacilityHours = () => {
    setFormData((current) => ({
      ...current,
      operating_start_time: "",
      operating_end_time: "",
    }));
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Facility admin"
      title={mode === "edit" ? "Edit Resource" : "New Resource"}
      description="Define a schedulable lane such as a physician, room, lab, or follow-up resource."
      formId="resource-form"
      saving={saving}
      deleteLabel={mode === "edit" && onDelete ? "Deactivate" : ""}
      onDelete={mode === "edit" ? onDelete : undefined}
    >
      <form id="resource-form" onSubmit={handleSubmit} className="grid gap-4">
        <AdminRecordPreview
          eyebrow="Schedule resource"
          title={formData.name || "Unnamed resource"}
          description={
            formData.is_active
              ? "Available for schedule lanes"
              : "Hidden from active scheduling"
          }
          meta={[mode === "edit" ? "Existing record" : "New record"]}
          color="#3b82f6"
        >
          <div className="grid gap-2 text-sm text-cf-text-muted sm:grid-cols-2">
            <span className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2">
              Room · {getResourceRoomLabel(formData)}
            </span>
            <span className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2">
              {getResourceHoursLabel(formData, facility)}
            </span>
          </div>
        </AdminRecordPreview>

        <AdminFormSection title="Resource Details">
          <div className="space-y-4">
            <AdminField label="Name">
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Lab, Follow-up, Dr. Jane Smith, Exam Room 1"
                required
              />
            </AdminField>

            <AdminField label="Default room">
              <Input
                name="default_room"
                value={formData.default_room}
                onChange={handleChange}
                placeholder="Any room"
              />
            </AdminField>

            <AdminToggleField
              label="Active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
          </div>
        </AdminFormSection>

        <AdminFormSection title="Hours">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <AdminField label="Start time">
              <Input
                type="time"
                name="operating_start_time"
                value={formData.operating_start_time}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="End time">
              <Input
                type="time"
                name="operating_end_time"
                value={formData.operating_end_time}
                onChange={handleChange}
              />
            </AdminField>
            <button
              type="button"
              onClick={handleUseFacilityHours}
              className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2.5 text-sm font-semibold text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text"
            >
              Use facility hours
            </button>
          </div>
        </AdminFormSection>
      </form>
    </AdminFormModal>
  );
}
