import { useEffect, useState } from "react";

import ColorPickerField from "../../../../shared/components/ColorPickerField";
import { Input } from "../../../../shared/components/ui";
import {
  AdminField,
  AdminFormModal,
  AdminRecordPreview,
  AdminFormSection,
  AdminToggleField,
  getReadablePreviewTextColor,
} from "../shared/AdminFormModal";

const DEFAULT_FORM = {
  code: "",
  name: "",
  color: "#c084fc",
  duration_minutes: 15,
  is_active: true,
};

export default function AppointmentTypeModal({
  isOpen,
  mode = "create",
  initialValues = null,
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
        code: initialValues.code || "",
        name: initialValues.name || "",
        color: initialValues.color || "#c084fc",
        duration_minutes: initialValues.duration_minutes || 15,
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [isOpen, initialValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "duration_minutes"
            ? Number(value)
            : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Facility admin"
      title={mode === "edit" ? "Edit Appointment Type" : "New Appointment Type"}
      description="Appointment types set the default duration and visual rhythm of the schedule."
      formId="appt-type-form"
      saving={saving}
      deleteLabel={
        mode === "edit" && onDelete
          ? initialValues?.is_deletable
            ? "Delete"
            : "Deactivate"
          : ""
      }
      onDelete={mode === "edit" ? onDelete : undefined}
    >
      <form id="appt-type-form" onSubmit={handleSubmit} className="space-y-4">
        <AdminRecordPreview
          eyebrow="Appointment template"
          title={formData.name || "Unnamed type"}
          description="Controls the scheduler default duration and visual treatment."
          meta={[
            formData.code || "No code",
            `${formData.duration_minutes || 0} min`,
            formData.is_active ? "Active" : "Inactive",
          ]}
          color={formData.color || "#c084fc"}
        >
          <div
            className="rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5"
            style={{
              backgroundColor: formData.color || "#c084fc",
              color: getReadablePreviewTextColor(formData.color),
            }}
          >
            {formData.name || "Appointment type"} ·{" "}
            {formData.duration_minutes || 0} min
          </div>
        </AdminRecordPreview>

        <AdminFormSection title="Type Details">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Code">
              <Input
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
              />
            </AdminField>

            <AdminField label="Name">
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </AdminField>

            <AdminField label="Duration (minutes)">
              <Input
                type="number"
                min="5"
                step="5"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                required
              />
            </AdminField>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Display">
          <div className="space-y-4">
            <ColorPickerField
              label="Color"
              value={formData.color}
              onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
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
