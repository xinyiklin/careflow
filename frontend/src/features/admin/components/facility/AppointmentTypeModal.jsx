import { useEffect, useState } from "react";

import ColorPickerField from "../../../../shared/components/ColorPickerField";
import { Input } from "../../../../shared/components/ui";
import {
  AdminFormModal,
  getReadablePreviewTextColor,
} from "../shared/AdminFormModal";
import {
  CompactCard,
  CompactField,
  CompactMetric,
  CompactModalGrid,
  CompactModalLane,
  CompactPill,
  CompactRecordHeader,
  CompactToggle,
} from "../shared/AdminCompactModal";

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
      formId="appt-type-form"
      saving={saving}
      maxWidth="3xl"
      deleteLabel={
        mode === "edit" && onDelete
          ? initialValues?.is_deletable
            ? "Delete"
            : "Deactivate"
          : ""
      }
      onDelete={mode === "edit" ? onDelete : undefined}
    >
      <form id="appt-type-form" onSubmit={handleSubmit}>
        <CompactModalGrid>
          <CompactModalLane>
            <CompactCard>
              <CompactRecordHeader
                initials={(formData.name || "AT").slice(0, 2).toUpperCase()}
                title={formData.name || "Appointment type"}
                meta={`${formData.code || "No code"} · ${formData.duration_minutes} min`}
                accent={formData.color}
                action={
                  <CompactToggle
                    label="Active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                }
              />
            </CompactCard>

            <CompactCard eyebrow="Type">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="Code">
                  <Input
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                  />
                </CompactField>
                <CompactField label="Name">
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </CompactField>
                <CompactField label="Duration" className="sm:col-span-2">
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    required
                  />
                </CompactField>
              </div>
            </CompactCard>

            <CompactCard eyebrow="Display">
              <ColorPickerField
                label="Color"
                value={formData.color}
                onChange={(color) =>
                  setFormData((prev) => ({ ...prev, color }))
                }
              />
            </CompactCard>
          </CompactModalLane>

          <CompactCard eyebrow="Preview" title="Schedule block">
            <div
              className="rounded-2xl border border-cf-border p-3 shadow-[var(--shadow-panel)]"
              style={{
                borderLeft: `5px solid ${formData.color || "#c084fc"}`,
                backgroundColor: `${formData.color || "#c084fc"}18`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-cf-text">
                    {formData.name || "Appointment type"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-cf-text-muted">
                    {formData.duration_minutes} min visit
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-black/5"
                  style={{
                    backgroundColor: formData.color || "#c084fc",
                    color: getReadablePreviewTextColor(formData.color),
                  }}
                >
                  {formData.code || "TYPE"}
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <CompactMetric
                label="Minutes"
                value={formData.duration_minutes}
              />
              <CompactMetric label="Code" value={formData.code || "—"} />
              <div className="flex items-center">
                <CompactPill tone={formData.is_active ? "success" : "muted"}>
                  {formData.is_active ? "Active" : "Inactive"}
                </CompactPill>
              </div>
            </div>
          </CompactCard>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
