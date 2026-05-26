import { useEffect, useState } from "react";
import { MapPin, Clock, Eye } from "lucide-react";

import { Button, Input } from "../../../../shared/components/ui";
import { AdminFormModal } from "../shared/AdminFormModal";
import {
  getResourceHoursLabel,
  getResourceRoomLabel,
} from "./resourceScheduleUtils";

import type { ChangeEvent, FormEvent } from "react";
import type {
  AdminFacility,
  AdminResource,
  AdminSavePayload,
} from "../../types";

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
}: {
  isOpen: boolean;
  mode?: "create" | "edit";
  initialValues?: AdminResource | null;
  facility?: AdminFacility | null;
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

  const isEditMode = mode === "edit";
  const initials = (formData.name || "RS").slice(0, 2).toUpperCase();

  const modalTitle = isEditMode ? (
    <div className="flex flex-wrap items-center justify-between gap-4 mr-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-cf-accent/10 border border-cf-accent/30 text-cf-accent flex items-center justify-center text-xs font-bold shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold tracking-tight text-cf-text leading-snug">
            {formData.name || "Unnamed Resource"}
          </h4>
          <p className="truncate text-[11px] text-cf-text-muted mt-0.5 font-normal">
            Room · {getResourceRoomLabel(formData)}
          </p>
        </div>
      </div>

      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
        <input
          type="checkbox"
          name="is_active"
          form="resource-form"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
        />
        Active
      </label>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-4 mr-6">
      <span className="text-sm font-semibold text-cf-text">New Resource</span>
      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
        <input
          type="checkbox"
          name="is_active"
          form="resource-form"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
        />
        Active
      </label>
    </div>
  );

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Facility Admin"
      title={modalTitle}
      formId="resource-form"
      saving={saving}
      deleteLabel={isEditMode && onDelete ? "Deactivate" : ""}
      onDelete={isEditMode ? onDelete : undefined}
      maxWidth="lg"
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60 overflow-y-auto max-h-[75vh] flex-1"
    >
      <form id="resource-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Resource Information */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <MapPin className="h-4 w-4 text-cf-accent" />
            Resource Information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Resource Name
              </span>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. Exam Room 1"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Default Room
              </span>
              <Input
                name="default_room"
                value={formData.default_room}
                onChange={handleChange}
                placeholder="e.g. Room A"
              />
            </label>
          </div>
        </div>

        {/* Section 2: Operating Hours */}
        <div className="border-t border-cf-border/60 pt-5 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Clock className="h-4 w-4 text-cf-accent" />
            Operating Hours
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Start Time
              </span>
              <Input
                type="time"
                name="operating_start_time"
                value={formData.operating_start_time}
                onChange={handleChange}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                End Time
              </span>
              <Input
                type="time"
                name="operating_end_time"
                value={formData.operating_end_time}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-cf-accent/5 border border-cf-accent/15 rounded-xl p-3 text-xs leading-relaxed text-cf-text-muted shadow-sm">
            <span>{getResourceHoursLabel(formData, facility)}</span>
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={handleUseFacilityHours}
            >
              Use facility hours
            </Button>
          </div>
        </div>

        {/* Section 3: Live Preview */}
        <div className="border-t border-cf-border/60 pt-5 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Eye className="h-4 w-4 text-cf-accent" />
            Live Preview
          </h3>

          <div className="rounded-xl border border-cf-border bg-cf-surface-soft/55 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-cf-text">
                  {formData.name || "Resource"}
                </div>
                <div className="mt-1 text-[11px] font-medium text-cf-text-muted">
                  {getResourceRoomLabel(formData)}
                </div>
              </div>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-black/5",
                  formData.is_active
                    ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                    : "bg-slate-500/10 text-slate-500 ring-slate-500/20",
                ].join(" ")}
              >
                {formData.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-[4rem_1fr] gap-2 text-xs">
              {["08:00", "09:00", "10:00"].map((time) => (
                <div key={time} className="contents">
                  <span className="pt-2 font-semibold text-cf-text-subtle">
                    {time}
                  </span>
                  <span className="rounded-lg border border-cf-border bg-cf-surface px-3 py-2 font-semibold text-cf-text-muted">
                    Open
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </AdminFormModal>
  );
}
