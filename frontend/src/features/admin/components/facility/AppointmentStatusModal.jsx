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
  CompactModalGrid,
  CompactModalLane,
  CompactPill,
  CompactRecordHeader,
  CompactToggle,
} from "../shared/AdminCompactModal";

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
      formId="appt-status-form"
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
      <form id="appt-status-form" onSubmit={handleSubmit}>
        <CompactModalGrid>
          <CompactModalLane>
            <CompactCard>
              <CompactRecordHeader
                initials={(formData.name || "ST").slice(0, 2).toUpperCase()}
                title={formData.name || "Appointment status"}
                meta={formData.code || "No code"}
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

            <CompactCard eyebrow="Status">
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

          <CompactCard eyebrow="Preview" title="Status treatment">
            <div className="rounded-2xl border border-cf-border bg-cf-surface-soft/55 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-cf-text">
                    10:30 AM · Follow-up
                  </div>
                  <div className="mt-1 truncate text-xs font-semibold text-cf-text-muted">
                    Patient block status
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-black/5"
                  style={{
                    backgroundColor: formData.color || "#94a3b8",
                    color: getReadablePreviewTextColor(formData.color),
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {formData.name || "Status"}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <CompactPill>{formData.code || "No code"}</CompactPill>
              <CompactPill tone={formData.is_active ? "success" : "muted"}>
                {formData.is_active ? "Active" : "Inactive"}
              </CompactPill>
            </div>
          </CompactCard>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
