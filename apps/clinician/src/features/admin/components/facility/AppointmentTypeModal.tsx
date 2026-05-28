import { useEffect, useState } from "react";
import { Activity, Palette, Eye, Globe } from "lucide-react";

import ColorPickerField from "../../../../shared/components/ColorPickerField";
import { Input } from "../../../../shared/components/ui";
import {
  AdminFormModal,
  getReadablePreviewTextColor,
} from "../shared/AdminFormModal";

import type { ChangeEvent, FormEvent } from "react";
import type { AdminAppointmentType, AdminSavePayload } from "../../types";

const DEFAULT_FORM = {
  code: "",
  name: "",
  color: "#c084fc",
  duration_minutes: 15,
  is_active: true,
  is_billable: true,
  bookable_online: false,
  auto_confirm_bookings: false,
};

export default function AppointmentTypeModal({
  isOpen,
  mode = "create",
  initialValues = null,
  saving = false,
  onClose,
  onSubmit,
  onDelete,
}: {
  isOpen: boolean;
  mode?: "create" | "edit";
  initialValues?: AdminAppointmentType | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: AdminSavePayload["values"]) => Promise<void> | void;
  onDelete?: () => void;
}) {
  const [formData, setFormData] = useState<typeof DEFAULT_FORM>(DEFAULT_FORM);

  useEffect(() => {
    if (!isOpen) return;

    if (initialValues) {
      setFormData({
        code: initialValues.code || "",
        name: initialValues.name || "",
        color: initialValues.color || "#c084fc",
        duration_minutes: Number(initialValues.duration_minutes || 15),
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
        is_billable:
          typeof initialValues.is_billable === "boolean"
            ? initialValues.is_billable
            : true,
        bookable_online: Boolean(initialValues.bookable_online),
        auto_confirm_bookings: Boolean(initialValues.auto_confirm_bookings),
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [isOpen, initialValues]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const isEditMode = mode === "edit";
  const initials = (formData.name || "AT").slice(0, 2).toUpperCase();

  const modalTitle = isEditMode ? (
    <div className="flex flex-wrap items-center justify-between gap-4 mr-6">
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-xl border flex items-center justify-center text-xs font-bold shadow-sm"
          style={{
            backgroundColor: `${formData.color}20`,
            borderColor: `${formData.color}40`,
            color: formData.color,
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold tracking-tight text-cf-text leading-snug">
            {formData.name || "Appointment Type"}
          </h4>
          <p className="truncate text-[11px] text-cf-text-muted mt-0.5 font-normal">
            {formData.code || "No code"} · {formData.duration_minutes} min
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
          <input
            type="checkbox"
            name="is_billable"
            form="appt-type-form"
            checked={formData.is_billable}
            onChange={handleChange}
            className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
          />
          Billable
        </label>
        <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
          <input
            type="checkbox"
            name="is_active"
            form="appt-type-form"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
          />
          Active
        </label>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-4 mr-6">
      <span className="text-sm font-semibold text-cf-text">
        New Appointment Type
      </span>
      <div className="flex items-center gap-3">
        <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
          <input
            type="checkbox"
            name="is_billable"
            form="appt-type-form"
            checked={formData.is_billable}
            onChange={handleChange}
            className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
          />
          Billable
        </label>
        <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
          <input
            type="checkbox"
            name="is_active"
            form="appt-type-form"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
          />
          Active
        </label>
      </div>
    </div>
  );

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Facility Admin"
      title={modalTitle}
      formId="appt-type-form"
      saving={saving}
      maxWidth="lg"
      deleteLabel={
        isEditMode && onDelete
          ? initialValues?.is_deletable
            ? "Delete"
            : "Deactivate"
          : ""
      }
      onDelete={isEditMode ? onDelete : undefined}
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60 overflow-y-auto max-h-[75vh] flex-1"
    >
      <form id="appt-type-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Type Details */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Activity className="h-4 w-4 text-cf-accent" />
            Type Details
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Type Code
              </span>
              <Input
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                placeholder="e.g. EST"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Type Name
              </span>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. Established Visit"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Duration (minutes)
              </span>
              <Input
                type="number"
                min="5"
                step="5"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                required
              />
            </label>
          </div>
        </div>

        {/* Section 2: Color Styling */}
        <div className="border-t border-cf-border/60 pt-5 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Palette className="h-4 w-4 text-cf-accent" />
            Color Styling
          </h3>

          <ColorPickerField
            label="Picker"
            value={formData.color}
            onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
          />
        </div>

        {/* Section 3: Online Booking */}
        <div className="border-t border-cf-border/60 pt-5 space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Globe className="h-4 w-4 text-cf-accent" />
            Online Booking
          </h3>

          <label className="flex items-start gap-3 rounded-xl border border-cf-border bg-cf-surface px-3 py-2.5 cursor-pointer hover:bg-cf-surface-soft transition">
            <input
              type="checkbox"
              name="bookable_online"
              checked={formData.bookable_online}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 accent-[var(--color-cf-accent)] cursor-pointer"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-cf-text">
                Bookable through the patient portal
              </div>
              <div className="text-[11px] text-cf-text-muted mt-0.5">
                Patients can pick this appointment type when scheduling online.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-cf-border bg-cf-surface px-3 py-2.5 cursor-pointer hover:bg-cf-surface-soft transition">
            <input
              type="checkbox"
              name="auto_confirm_bookings"
              checked={formData.auto_confirm_bookings}
              onChange={handleChange}
              disabled={!formData.bookable_online}
              className="mt-0.5 h-4 w-4 accent-[var(--color-cf-accent)] cursor-pointer disabled:opacity-40"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-cf-text">
                Auto-confirm portal bookings
              </div>
              <div className="text-[11px] text-cf-text-muted mt-0.5">
                When off, this type's portal bookings land as <em>pending</em>{" "}
                for staff review. The provider must also enable auto-confirm.
              </div>
            </div>
          </label>
        </div>

        {/* Section 4: Live Preview */}
        <div className="border-t border-cf-border/60 pt-5 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Eye className="h-4 w-4 text-cf-accent" />
            Live Preview
          </h3>

          <div
            className="rounded-xl border border-cf-border p-3 shadow-sm transition"
            style={{
              borderLeft: `4px solid ${formData.color || "#c084fc"}`,
              backgroundColor: `${formData.color || "#c084fc"}12`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-cf-text">
                  {formData.name || "Appointment type"}
                </div>
                <div className="mt-1 text-[11px] font-medium text-cf-text-muted">
                  {formData.duration_minutes} min visit
                </div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-black/5"
                style={{
                  backgroundColor: formData.color || "#c084fc",
                  color: getReadablePreviewTextColor(formData.color),
                }}
              >
                {formData.code || "TYPE"}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-cf-border bg-cf-surface px-2.5 py-0.5 font-semibold text-cf-text-muted">
              {formData.duration_minutes} Minutes
            </span>
            <span className="rounded-full border border-cf-border bg-cf-surface px-2.5 py-0.5 font-semibold text-cf-text-muted">
              Code: {formData.code || "—"}
            </span>
            <span
              className={[
                "rounded-full px-2.5 py-0.5 font-semibold ring-1 ring-black/5",
                formData.is_billable
                  ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                  : "bg-slate-500/10 text-slate-500 ring-slate-500/20",
              ].join(" ")}
            >
              {formData.is_billable ? "Billable" : "Non-billable"}
            </span>
            <span
              className={[
                "rounded-full px-2.5 py-0.5 font-semibold ring-1 ring-black/5",
                formData.is_active
                  ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                  : "bg-slate-500/10 text-slate-500 ring-slate-500/20",
              ].join(" ")}
            >
              {formData.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </form>
    </AdminFormModal>
  );
}
