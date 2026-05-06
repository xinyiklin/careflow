import { useEffect, useState } from "react";

import { Button, Input } from "../../../../shared/components/ui";
import { AdminFormModal } from "../shared/AdminFormModal";
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

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Facility admin"
      title={mode === "edit" ? "Edit Resource" : "New Resource"}
      formId="resource-form"
      saving={saving}
      deleteLabel={mode === "edit" && onDelete ? "Deactivate" : ""}
      onDelete={mode === "edit" ? onDelete : undefined}
      maxWidth="3xl"
    >
      <form id="resource-form" onSubmit={handleSubmit}>
        <CompactModalGrid>
          <CompactModalLane>
            <CompactCard>
              <CompactRecordHeader
                initials={(formData.name || "RS").slice(0, 2).toUpperCase()}
                title={formData.name || "Unnamed resource"}
                meta={`Room · ${getResourceRoomLabel(formData)}`}
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

            <CompactCard eyebrow="Resource">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="Name">
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </CompactField>
                <CompactField label="Default room">
                  <Input
                    name="default_room"
                    value={formData.default_room}
                    onChange={handleChange}
                  />
                </CompactField>
              </div>
            </CompactCard>

            <CompactCard eyebrow="Hours">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="Start">
                  <Input
                    type="time"
                    name="operating_start_time"
                    value={formData.operating_start_time}
                    onChange={handleChange}
                  />
                </CompactField>
                <CompactField label="End">
                  <Input
                    type="time"
                    name="operating_end_time"
                    value={formData.operating_end_time}
                    onChange={handleChange}
                  />
                </CompactField>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cf-border bg-cf-surface-soft/55 px-3 py-2 text-sm font-semibold text-cf-text-muted">
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
            </CompactCard>
          </CompactModalLane>

          <CompactCard eyebrow="Preview" title="Resource lane">
            <div className="rounded-2xl border border-cf-border bg-cf-surface-soft/55 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-cf-text">
                    {formData.name || "Resource"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-cf-text-muted">
                    {getResourceRoomLabel(formData)}
                  </div>
                </div>
                <CompactPill tone={formData.is_active ? "success" : "muted"}>
                  {formData.is_active ? "Active" : "Inactive"}
                </CompactPill>
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
            <div className="mt-3 grid grid-cols-2 gap-2">
              <CompactMetric
                label="Room"
                value={formData.default_room || "—"}
              />
              <CompactMetric
                label="Hours"
                value={
                  formData.operating_start_time || formData.operating_end_time
                    ? "Custom"
                    : "Facility"
                }
              />
            </div>
          </CompactCard>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
