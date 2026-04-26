import { useEffect, useState } from "react";

import { Badge, Input } from "../../../../shared/components/ui";
import {
  SECURITY_PERMISSION_GROUPS,
  normalizeSecurityPermissions,
} from "../../constants/securityPermissions";
import {
  AdminField,
  AdminFormModal,
  AdminFormSection,
  AdminToggleField,
} from "../shared/AdminFormModal";

const DEFAULT_FORM = {
  user_id: "",
  role_id: "",
  title_id: "",
  is_active: true,
  security_overrides: {},
};

const HIGH_IMPACT_PERMISSION_KEYS = new Set([
  "schedule.delete",
  "patients.delete",
  "documents.categories.manage",
  "pharmacies.manage",
  "admin.facility.manage",
]);

function getPermissionItems() {
  return SECURITY_PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((permission) => ({
      ...permission,
      groupLabel: group.label,
    }))
  );
}

function getPermissionSummary(permissions) {
  const items = getPermissionItems();
  const allowed = items.filter((permission) => permissions[permission.key]);
  const highImpact = allowed.filter((permission) =>
    HIGH_IMPACT_PERMISSION_KEYS.has(permission.key)
  );

  return {
    allowed,
    highImpact,
    total: items.length,
  };
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

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Facility admin"
      title={isEditMode ? `Edit ${recordLabel}` : `New ${recordLabel}`}
      description="Assign a user to this facility and manage their operational role and access exceptions."
      maxWidth="xl"
      formId="staff-form"
      saving={saving}
      deleteLabel={isEditMode && onDelete ? `Remove ${recordLabel}` : ""}
      onDelete={isEditMode ? onDelete : undefined}
    >
      <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
        <AdminFormSection title="Membership">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="User" className="md:col-span-2">
              <Input
                as="select"
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                required
                disabled={isEditMode}
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || user.last_name
                      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                      : user.username}
                  </option>
                ))}
              </Input>
              {isEditMode && (
                <p className="mt-1 text-xs text-cf-text-subtle">
                  User cannot be changed after the staff membership is created.
                </p>
              )}
            </AdminField>

            <AdminField label="Role">
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
            </AdminField>

            <AdminField label="Title">
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
            </AdminField>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Access State">
          <div className="grid gap-3">
            <AdminToggleField
              label="Active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
          </div>
        </AdminFormSection>

        {role ? (
          <AdminFormSection title="Access Preview">
            <div className="rounded-2xl border border-cf-border bg-cf-surface-soft/55 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-cf-text">
                    {permissionSummary.allowed.length} of{" "}
                    {permissionSummary.total} permissions allowed
                  </div>
                  <p className="mt-1 text-xs leading-5 text-cf-text-muted">
                    Effective access combines the selected role with the
                    security overrides below.
                  </p>
                </div>
                <Badge
                  variant={
                    permissionSummary.highImpact.length ? "warning" : "muted"
                  }
                >
                  {permissionSummary.highImpact.length
                    ? `${permissionSummary.highImpact.length} high-impact`
                    : "No high-impact access"}
                </Badge>
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
          </AdminFormSection>
        ) : null}

        {isEditMode ? (
          <AdminFormSection title="Security Overrides">
            <div className="space-y-4">
              {SECURITY_PERMISSION_GROUPS.map((group) => (
                <div key={group.key}>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                    {group.label}
                  </div>
                  <div className="mt-2 grid gap-2">
                    {group.permissions.map((permission) => {
                      const overrideValue =
                        formData.security_overrides?.[permission.key];
                      const selectValue =
                        overrideValue === true
                          ? "grant"
                          : overrideValue === false
                            ? "revoke"
                            : "inherit";

                      return (
                        <label
                          key={permission.key}
                          className="grid gap-2 rounded-xl border border-cf-border bg-cf-surface-soft/55 px-3 py-3 sm:grid-cols-[1fr_9rem] sm:items-center"
                        >
                          <span>
                            <span className="block text-sm font-medium text-cf-text">
                              {permission.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-cf-text-subtle">
                              Role default:{" "}
                              {inheritedPermissions[permission.key]
                                ? "Allowed"
                                : "Blocked"}
                              . Effective:{" "}
                              {effectivePermissions[permission.key]
                                ? "Allowed"
                                : "Blocked"}
                              .
                            </span>
                          </span>
                          <Input
                            as="select"
                            value={selectValue}
                            onChange={(event) =>
                              handleSecurityOverrideChange(
                                permission.key,
                                event.target.value
                              )
                            }
                          >
                            <option value="inherit">Inherit</option>
                            <option value="grant">Allow</option>
                            <option value="revoke">Block</option>
                          </Input>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </AdminFormSection>
        ) : null}
      </form>
    </AdminFormModal>
  );
}
