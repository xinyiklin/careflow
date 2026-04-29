import { useEffect, useState } from "react";

import { Badge, Input } from "../../../../shared/components/ui";
import { normalizeSecurityPermissions } from "../../constants/securityPermissions";
import { AdminFormModal } from "../shared/AdminFormModal";
import {
  AccessMetric,
  CompactField,
  SecurityOverrideBoard,
  getInitialsFromName,
  getOverrideStats,
  getPermissionSummary,
} from "./StaffModalSections";

const DEFAULT_FORM = {
  user_id: "",
  role_id: "",
  title_id: "",
  is_active: true,
  security_overrides: {},
};

function getUserDisplayName(user) {
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
  saving = false,
  onClose,
  onSubmit,
  onDelete,
  recordLabel = "Staff Member",
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setFormData({
        user_id: initialValues.user?.id || "",
        role_id: initialValues.role?.id || initialValues.role || "",
        title_id: initialValues.title?.id || initialValues.title || "",
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
        security_overrides: initialValues.security_overrides || {},
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

  const handleSecurityOverrideChange = (permissionKey, value) => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({
      user: formData.user_id ? Number(formData.user_id) : "",
      role: formData.role_id ? Number(formData.role_id) : "",
      title: formData.title_id ? Number(formData.title_id) : null,
      is_active: formData.is_active,
      security_overrides: formData.security_overrides,
    });
  };

  const isEditMode = mode === "edit";
  const role = roles.find(
    (candidate) => String(candidate.id) === String(formData.role_id)
  );
  const inheritedPermissions = normalizeSecurityPermissions(
    role?.security_permissions
  );
  const effectivePermissions = {
    ...inheritedPermissions,
    ...(formData.security_overrides || {}),
  };
  const permissionSummary = getPermissionSummary(effectivePermissions);
  const selectedUser =
    users.find((user) => String(user.id) === String(formData.user_id)) ||
    initialValues?.user;
  const hasSelectedUserOption = users.some(
    (user) => String(user.id) === String(selectedUser?.id)
  );
  const title = titles.find(
    (candidate) => String(candidate.id) === String(formData.title_id)
  );
  const overrideStats = getOverrideStats(formData.security_overrides);

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Facility admin"
      title={isEditMode ? `Edit ${recordLabel}` : `New ${recordLabel}`}
      maxWidth="4xl"
      formId="staff-form"
      saving={saving}
      deleteLabel={isEditMode && onDelete ? `Remove ${recordLabel}` : ""}
      onDelete={isEditMode ? onDelete : undefined}
    >
      <form
        id="staff-form"
        onSubmit={handleSubmit}
        className="grid gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
      >
        <section className="space-y-3">
          <div className="rounded-[1.15rem] border border-cf-border bg-cf-surface p-3 shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cf-border bg-cf-surface-soft text-sm font-bold text-cf-text">
                {getInitialsFromName(
                  getUserDisplayName(selectedUser),
                  recordLabel.slice(0, 2)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-cf-text">
                  {getUserDisplayName(selectedUser)}
                </div>
                <div className="mt-0.5 truncate text-sm text-cf-text-muted">
                  {role?.name || "No role"} · {title?.name || recordLabel}
                </div>
              </div>
              <label className="flex shrink-0 items-center gap-2 rounded-full border border-cf-border bg-cf-page-bg px-2.5 py-1 text-xs font-semibold text-cf-text-muted">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-3.5 w-3.5 accent-[var(--color-cf-accent)]"
                />
                Active
              </label>
            </div>
          </div>

          <div className="rounded-[1.15rem] border border-cf-border bg-cf-surface p-3 shadow-[var(--shadow-panel)]">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Membership
            </div>
            <div className="grid gap-3">
              <CompactField label="User">
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
              </CompactField>

              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="Role">
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
                </CompactField>

                <CompactField label="Title">
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
                </CompactField>
              </div>
            </div>
          </div>

          <div className="rounded-[1.15rem] border border-cf-border bg-cf-surface p-3 shadow-[var(--shadow-panel)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                  Access snapshot
                </div>
                <div className="text-base font-semibold text-cf-text">
                  {role?.name || "Role required"}
                </div>
              </div>
              <Badge
                variant={
                  permissionSummary.highImpact.length ? "warning" : "muted"
                }
              >
                {permissionSummary.highImpact.length} high-impact
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <AccessMetric
                label="Allowed"
                value={`${permissionSummary.allowed.length}/${permissionSummary.total}`}
              />
              <AccessMetric label="Custom" value={overrideStats.total} />
              <AccessMetric label="Blocked" value={overrideStats.blocked} />
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-cf-border">
              <div
                className="h-full rounded-full bg-cf-accent"
                style={{
                  width: `${Math.round(
                    (permissionSummary.allowed.length /
                      Math.max(permissionSummary.total, 1)) *
                      100
                  )}%`,
                }}
              />
            </div>

            {permissionSummary.highImpact.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {permissionSummary.highImpact.map((permission) => (
                  <Badge key={permission.key} variant="outline">
                    {permission.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {isEditMode ? (
          <SecurityOverrideBoard
            inheritedPermissions={inheritedPermissions}
            effectivePermissions={effectivePermissions}
            securityOverrides={formData.security_overrides}
            onChange={handleSecurityOverrideChange}
          />
        ) : (
          <section className="rounded-[1.15rem] border border-dashed border-cf-border bg-cf-surface-soft/45 p-5 text-sm font-medium text-cf-text-muted">
            Overrides unlock after the member is saved.
          </section>
        )}
      </form>
    </AdminFormModal>
  );
}
