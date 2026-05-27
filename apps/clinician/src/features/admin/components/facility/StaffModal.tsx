import { useEffect, useState } from "react";

import { Input, SegmentedControl } from "../../../../shared/components/ui";
import { normalizeSecurityPermissions } from "../../constants/securityPermissions";
import { AdminFormModal } from "../shared/AdminFormModal";
import {
  SecurityOverrideBoard,
  getInitialsFromName,
} from "./StaffModalSections";

import type { ChangeEvent, FormEvent } from "react";
import type {
  AdminOrganizationFeeSchedule,
  AdminSavePayload,
  AdminStaff,
  AdminStaffRole,
} from "../../types";
import type { UserProfile } from "../../../../shared/types/domain";
import type { SecurityPermissionKey } from "../../constants/securityPermissions";

type AdminSelectOption = {
  id?: string | number;
  name?: string | null;
  security_permissions?: Partial<Record<SecurityPermissionKey, boolean>> | null;
};

const DEFAULT_FORM = {
  user_id: "",
  role_id: "",
  title_id: "",
  fee_schedule_id: "",
  is_active: true,
  npi: "",
  dea_number: "",
  state_license_number: "",
  state_license_state: "",
  state_license_expiration: "",
  dea_expiration: "",
  specialty: "",
  taxonomy_code: "",
  security_overrides: {} as Partial<Record<SecurityPermissionKey, boolean>>,
};

function getStaffRoleId(role: AdminStaff["role"]) {
  return typeof role === "object" && role ? role.id || "" : role || "";
}

function getStaffTitleId(title: AdminStaff["title"]) {
  return typeof title === "object" && title ? title.id || "" : title || "";
}

function getUserDisplayName(
  user: UserProfile | AdminStaff["user"] | null | undefined
) {
  if (!user) return "Select user";
  return user.first_name || user.last_name
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : user.username;
}

export default function StaffModal({
  isOpen,
  mode = "create",
  initialValues = null,
  roles = [],
  titles = [],
  users = [],
  feeSchedules = [],
  saving = false,
  onClose,
  onSubmit,
  onDelete,
  recordLabel = "Staff Member",
}: {
  isOpen: boolean;
  mode?: "create" | "edit";
  initialValues?: AdminStaff | null;
  roles?: AdminStaffRole[];
  titles?: AdminSelectOption[];
  users?: UserProfile[];
  feeSchedules?: AdminOrganizationFeeSchedule[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: AdminSavePayload["values"]) => Promise<void> | void;
  onDelete?: () => void;
  recordLabel?: string;
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("profile"); // reset to first tab when opening
    if (initialValues) {
      setFormData({
        user_id: initialValues.user?.id ? String(initialValues.user.id) : "",
        role_id: String(getStaffRoleId(initialValues.role) || ""),
        title_id: String(getStaffTitleId(initialValues.title) || ""),
        fee_schedule_id: String(initialValues.fee_schedule || ""),
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
        npi: initialValues.npi || "",
        dea_number: initialValues.dea_number || "",
        state_license_number: initialValues.state_license_number || "",
        state_license_state: initialValues.state_license_state || "",
        state_license_expiration: initialValues.state_license_expiration || "",
        dea_expiration: initialValues.dea_expiration || "",
        specialty: initialValues.specialty || "",
        taxonomy_code: initialValues.taxonomy_code || "",
        security_overrides: initialValues.security_overrides || {},
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [isOpen, initialValues]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      e.target instanceof HTMLInputElement ? e.target.checked : false;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSecurityOverrideChange = (
    permissionKey: SecurityPermissionKey,
    value: "inherit" | "grant" | "revoke"
  ) => {
    setFormData((prev) => {
      const nextOverrides = { ...(prev.security_overrides || {}) };

      if (value === "inherit") {
        delete nextOverrides[permissionKey];
      } else {
        nextOverrides[permissionKey] = value === "grant";
      }

      return { ...prev, security_overrides: nextOverrides };
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.({
      user: formData.user_id ? Number(formData.user_id) : "",
      role: formData.role_id ? Number(formData.role_id) : "",
      title: formData.title_id ? Number(formData.title_id) : null,
      fee_schedule: formData.fee_schedule_id
        ? Number(formData.fee_schedule_id)
        : null,
      is_active: formData.is_active,
      npi: formData.npi || "",
      dea_number: formData.dea_number || "",
      state_license_number: formData.state_license_number || "",
      state_license_state: formData.state_license_state || "",
      state_license_expiration: formData.state_license_expiration || null,
      dea_expiration: formData.dea_expiration || null,
      specialty: formData.specialty || "",
      taxonomy_code: formData.taxonomy_code || "",
      security_overrides: formData.security_overrides,
    });
  };

  const isEditMode = mode === "edit";
  const role = roles.find(
    (candidate) => String(candidate.id) === String(formData.role_id)
  );
  const inheritedPermissions = normalizeSecurityPermissions(
    role?.security_permissions || undefined
  );
  const effectivePermissions = {
    ...inheritedPermissions,
    ...(formData.security_overrides || {}),
  };
  const selectedUser =
    users.find((user) => String(user.id) === String(formData.user_id)) ||
    initialValues?.user;
  const hasSelectedUserOption = users.some(
    (user) => String(user.id) === String(selectedUser?.id)
  );
  const title = titles.find(
    (candidate) => String(candidate.id) === String(formData.title_id)
  );
  const isPhysicianRole =
    (role?.code || "").toLowerCase() === "physician" ||
    (role?.name || "").toLowerCase() === "physician";

  const modalTitle = isEditMode ? (
    <div className="flex flex-wrap items-center justify-between gap-4 mr-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cf-border bg-cf-surface-soft text-xs font-bold text-cf-text shadow-sm">
          {getInitialsFromName(
            getUserDisplayName(selectedUser),
            recordLabel.slice(0, 2)
          )}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-cf-text truncate leading-snug">
            {getUserDisplayName(selectedUser)}
          </div>
          <div className="mt-0.5 text-xs text-cf-text-muted truncate font-normal">
            {role?.name || "No role"} {title?.name ? `· ${title.name}` : ""}
          </div>
        </div>
      </div>

      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
        <input
          type="checkbox"
          name="is_active"
          form="staff-form"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
        />
        Active
      </label>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-4 mr-6">
      <span className="text-sm font-semibold text-cf-text">
        New {recordLabel}
      </span>
      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
        <input
          type="checkbox"
          name="is_active"
          form="staff-form"
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
      maxWidth={isEditMode ? "2xl" : "xl"}
      formId="staff-form"
      saving={saving}
      deleteLabel={isEditMode && onDelete ? `Remove ${recordLabel}` : ""}
      onDelete={isEditMode ? onDelete : undefined}
    >
      <form id="staff-form" onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Tabs Selector for Edit Mode */}
          {isEditMode && (
            <SegmentedControl
              options={[
                { value: "profile", label: "Profile & Credentials" },
                { value: "security", label: "Security Overrides" },
              ]}
              value={activeTab}
              onChange={(val) => setActiveTab(val as "profile" | "security")}
              size="xs"
              className="w-full"
            />
          )}

          {/* Profile & Credentials Content */}
          {(!isEditMode || activeTab === "profile") && (
            <div className="space-y-6">
              {/* Membership details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
                  Membership Details
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                      User Account
                    </span>
                    <Input
                      as="select"
                      name="user_id"
                      value={formData.user_id}
                      onChange={handleChange}
                      required
                      disabled={isEditMode}
                    >
                      <option value="">Select user</option>
                      {selectedUser && !hasSelectedUserOption ? (
                        <option value={selectedUser.id}>
                          {getUserDisplayName(selectedUser)}
                        </option>
                      ) : null}
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name || user.last_name
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                            : user.username}
                        </option>
                      ))}
                    </Input>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                      Role
                    </span>
                    <Input
                      as="select"
                      name="role_id"
                      value={formData.role_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Input>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                      Title
                    </span>
                    <Input
                      as="select"
                      name="title_id"
                      value={formData.title_id}
                      onChange={handleChange}
                    >
                      <option value="">No title</option>
                      {titles.map((title) => (
                        <option key={title.id} value={title.id}>
                          {title.name}
                        </option>
                      ))}
                    </Input>
                  </div>

                  {feeSchedules.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        Fee Schedule
                      </span>
                      <Input
                        as="select"
                        name="fee_schedule_id"
                        value={formData.fee_schedule_id}
                        onChange={handleChange}
                      >
                        <option value="">Facility default</option>
                        {feeSchedules.map((schedule) => (
                          <option key={schedule.id} value={schedule.id}>
                            {schedule.name}
                          </option>
                        ))}
                      </Input>
                    </div>
                  )}
                </div>
              </div>

              {/* Provider Credentials (Gated by Physician role) */}
              {isPhysicianRole && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
                    Provider Credentials
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        NPI
                      </span>
                      <Input
                        name="npi"
                        value={formData.npi}
                        onChange={handleChange}
                        maxLength={10}
                        placeholder="10-digit NPI"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        Specialty
                      </span>
                      <Input
                        name="specialty"
                        value={formData.specialty}
                        onChange={handleChange}
                        placeholder="e.g. Internal Medicine"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        DEA Number
                      </span>
                      <Input
                        name="dea_number"
                        value={formData.dea_number}
                        onChange={handleChange}
                        placeholder="DEA registration"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        DEA Expiration
                      </span>
                      <Input
                        type="date"
                        name="dea_expiration"
                        value={formData.dea_expiration}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        License Number
                      </span>
                      <Input
                        name="state_license_number"
                        value={formData.state_license_number}
                        onChange={handleChange}
                        placeholder="State license #"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        State
                      </span>
                      <Input
                        name="state_license_state"
                        value={formData.state_license_state}
                        onChange={handleChange}
                        maxLength={2}
                        placeholder="e.g. NY"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                        Expiration
                      </span>
                      <Input
                        type="date"
                        name="state_license_expiration"
                        value={formData.state_license_expiration}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                      Taxonomy Code
                    </span>
                    <Input
                      name="taxonomy_code"
                      value={formData.taxonomy_code}
                      onChange={handleChange}
                      placeholder="e.g. 207Q00000X"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Overrides Content */}
          {isEditMode && activeTab === "security" && (
            <div className="min-h-0">
              <SecurityOverrideBoard
                inheritedPermissions={inheritedPermissions}
                effectivePermissions={effectivePermissions}
                securityOverrides={formData.security_overrides}
                onChange={handleSecurityOverrideChange}
              />
            </div>
          )}
        </div>
      </form>
    </AdminFormModal>
  );
}
