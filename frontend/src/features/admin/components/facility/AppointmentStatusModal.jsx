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
  color: "#94a3b8",
  is_active: true,
};

export default function AppointmentStatusModal({
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
        color: initialValues.color || "#94a3b8",
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
      [name]: type === "checkbox" ? checked : value,
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
      title={
        mode === "edit" ? "Edit Appointment Status" : "New Appointment Status"
      }
      description="Status labels drive schedule color, filtering, and day-of-workflow state."
      maxWidth="xl"
      formId="appt-status-form"
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
      <form id="appt-status-form" onSubmit={handleSubmit} className="space-y-4">
        <AdminRecordPreview
          eyebrow="Schedule status"
          title={formData.name || "Unnamed status"}
          description={
            formData.is_active
              ? "Visible in schedule filters and appointment blocks"
              : "Inactive status"
          }
          meta={[
            formData.code || "No code",
            formData.is_active ? "Active" : "Inactive",
          ]}
          color={formData.color || "#94a3b8"}
        >
          <div
            className="rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5"
            style={{
              backgroundColor: formData.color || "#94a3b8",
              color: getReadablePreviewTextColor(formData.color),
            }}
          >
            {formData.name || "Appointment status"}
          </div>
        </AdminRecordPreview>

        <AdminFormSection title="Status Details">
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
