import { useEffect, useState } from "react";
import { Shield, Tag } from "lucide-react";

import { Input } from "../../../../shared/components/ui";
import { AdminFormModal } from "../shared/AdminFormModal";

import type { ChangeEvent, FormEvent } from "react";
import type { AdminSavePayload } from "../../types";
import type { OrgSecurityRole } from "../../api/organization/security";

const DEFAULT_FORM = {
  code: "",
  name: "",
  description: "",
  is_active: true,
};

export default function OrgRoleModal({
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
  initialValues?: OrgSecurityRole | null;
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
        code: initialValues.key || "",
        name: initialValues.label || "",
        description: initialValues.description || "",
        is_active: true,
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [isOpen, initialValues]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const isEditMode = mode === "edit";
  const isSystem = initialValues?.is_system_role === true;

  const modalTitle = isEditMode ? (
    <div className="flex flex-wrap items-center justify-between gap-4 mr-6">
      <div className="flex items-center gap-3">
        <span
          className={[
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
            isSystem
              ? "bg-cf-accent/10 text-cf-accent"
              : "bg-cf-surface-soft text-cf-text-muted",
          ].join(" ")}
        >
          <Shield className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold tracking-tight text-cf-text leading-snug">
            {formData.name || "Untitled Role"}
          </h4>
          <p className="truncate text-[11px] text-cf-text-muted mt-0.5 font-normal">
            Code · {formData.code || "No code"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isSystem && (
          <span className="shrink-0 rounded-full bg-cf-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cf-accent">
            System
          </span>
        )}
        {!isSystem && (
          <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
            <input
              type="checkbox"
              name="is_active"
              form="org-role-form"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
            />
            Active
          </label>
        )}
      </div>
    </div>
  ) : (
    <span className="text-sm font-semibold text-cf-text">New Role</span>
  );

  const canDelete =
    isEditMode &&
    onDelete &&
    !isSystem &&
    initialValues?.is_deletable !== false;

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization Admin"
      title={modalTitle}
      formId="org-role-form"
      saving={saving}
      maxWidth="md"
      deleteLabel={
        canDelete ? "Delete" : isEditMode && !isSystem ? "Deactivate" : ""
      }
      onDelete={isEditMode && !isSystem ? onDelete : undefined}
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60 overflow-y-auto max-h-[75vh] flex-1"
    >
      <form id="org-role-form" onSubmit={handleSubmit} className="space-y-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
          <Tag className="h-4 w-4 text-cf-accent" />
          Role Details
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
              Role Code
            </span>
            <Input
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              disabled={isSystem}
              placeholder="e.g. billing_clerk"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
              Role Name
            </span>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isSystem}
              placeholder="e.g. Billing Clerk"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
            Description
          </span>
          <Input
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={isSystem}
          />
        </label>

        {isSystem && (
          <p className="rounded-xl border border-cf-border bg-cf-surface-soft/60 px-3 py-2 text-xs text-cf-text-muted">
            System roles cannot be renamed or deleted. You can manage their
            permissions from the Permissions view.
          </p>
        )}
      </form>
    </AdminFormModal>
  );
}
