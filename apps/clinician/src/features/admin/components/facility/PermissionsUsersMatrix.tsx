import { useMemo } from "react";
import { User } from "lucide-react";

import { SegmentedControl } from "../../../../shared/components/ui";
import {
  SECURITY_PERMISSION_GROUPS,
  SECURITY_PERMISSION_KEYS,
  normalizeSecurityPermissions,
  type SecurityPermissionKey,
} from "../../constants/securityPermissions";
import {
  isDestructivePermission,
  filterPermissionGroups,
  type PermissionGroup,
} from "../../constants/permissionUtils";
import SecurityColumnHeader from "../shared/SecurityColumnHeader";
import PermissionMatrixShell from "../shared/PermissionMatrixShell";
import PermissionRowLabel from "../shared/PermissionRowLabel";

import type { AdminStaff, AdminStaffRole } from "../../types";

type OverrideMode = "inherit" | "grant" | "revoke";

const OVERRIDE_OPTIONS = [
  { value: "inherit" as const, label: "Role" },
  { value: "grant" as const, label: "Allow" },
  { value: "revoke" as const, label: "Block" },
] as const;

function getStaffDisplayName(staff: AdminStaff) {
  const u = staff.user;
  if (!u) return String(staff.id);
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return full || u.username || String(staff.id);
}

function getStaffRolePermissions(staff: AdminStaff, roles: AdminStaffRole[]) {
  const roleObj =
    typeof staff.role === "object" && staff.role ? staff.role : null;
  const roleId = roleObj?.id || staff.role_id || staff.role;
  const match = roles.find((r) => String(r.id) === String(roleId));
  return normalizeSecurityPermissions(match?.security_permissions || undefined);
}

function getEffectiveAccess(
  staff: AdminStaff,
  permissionKey: SecurityPermissionKey,
  roles: AdminStaffRole[]
) {
  const rolePerms = getStaffRolePermissions(staff, roles);
  const overrides =
    (staff.security_overrides as Record<string, boolean> | null) || {};
  const hasOverride = permissionKey in overrides;
  const roleValue = rolePerms[permissionKey];
  const effectiveValue = hasOverride
    ? Boolean(overrides[permissionKey])
    : roleValue;

  return { roleValue, hasOverride, effectiveValue };
}

function getOverrideMode(
  staff: AdminStaff,
  permissionKey: SecurityPermissionKey,
  roles: AdminStaffRole[]
): OverrideMode {
  const { hasOverride, effectiveValue } = getEffectiveAccess(
    staff,
    permissionKey,
    roles
  );
  if (!hasOverride) return "inherit";
  return effectiveValue ? "grant" : "revoke";
}

function getUserEffectiveStats(staff: AdminStaff, roles: AdminStaffRole[]) {
  let allowedCount = 0;
  for (const key of SECURITY_PERMISSION_KEYS) {
    const { effectiveValue } = getEffectiveAccess(staff, key, roles);
    if (effectiveValue) allowedCount++;
  }
  return { allowedCount, totalCount: SECURITY_PERMISSION_KEYS.length };
}

function getStaffRoleName(staff: AdminStaff, roles: AdminStaffRole[]) {
  const roleObj =
    typeof staff.role === "object" && staff.role ? staff.role : null;
  if (roleObj?.name) return roleObj.name;
  const roleId = roleObj?.id || staff.role_id || staff.role;
  const match = roles.find((r) => String(r.id) === String(roleId));
  return match?.name || "—";
}

function OverrideCell({
  staff,
  permissionKey,
  roles,
  disabled,
  saving,
  onToggle,
}: {
  staff: AdminStaff;
  permissionKey: SecurityPermissionKey;
  roles: AdminStaffRole[];
  disabled: boolean;
  saving: boolean;
  onToggle: (
    staff: AdminStaff,
    permissionKey: SecurityPermissionKey,
    mode: OverrideMode
  ) => void;
}) {
  const mode = getOverrideMode(staff, permissionKey, roles);
  const { effectiveValue, hasOverride } = getEffectiveAccess(
    staff,
    permissionKey,
    roles
  );

  return (
    <td
      className={[
        "border-b border-cf-border px-2 py-2 text-center align-middle",
        hasOverride ? "bg-cf-warning-bg/30" : "",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-1.5">
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            effectiveValue
              ? "bg-cf-success-bg text-cf-success-text"
              : "bg-cf-surface-soft text-cf-text-muted",
          ].join(" ")}
        >
          {effectiveValue ? "Allowed" : "Blocked"}
        </span>
        <SegmentedControl
          options={OVERRIDE_OPTIONS}
          value={mode}
          onChange={(newMode) => onToggle(staff, permissionKey, newMode)}
          size="xs"
          variant="pill"
          disabled={disabled || saving}
        />
      </div>
    </td>
  );
}

export default function PermissionsUsersMatrix({
  staff,
  roles,
  disabled,
  savingCellKey,
  query,
  onToggleUserOverride,
}: {
  staff: AdminStaff[];
  roles: AdminStaffRole[];
  disabled: boolean;
  savingCellKey: string;
  query: string;
  onToggleUserOverride: (
    staff: AdminStaff,
    permissionKey: SecurityPermissionKey,
    mode: "inherit" | "grant" | "revoke"
  ) => void;
}) {
  const visibleGroups = useMemo<readonly PermissionGroup[]>(
    () => filterPermissionGroups(SECURITY_PERMISSION_GROUPS, query),
    [query]
  );

  if (staff.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cf-border px-5 py-10 text-center text-sm text-cf-text-muted">
        <User className="mx-auto mb-2 h-5 w-5 text-cf-text-subtle" />
        No staff members match the selected filter.
      </div>
    );
  }

  if (visibleGroups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cf-border px-5 py-10 text-center text-sm text-cf-text-muted">
        No permission rows match your search.
      </div>
    );
  }

  return (
    <PermissionMatrixShell
      groups={visibleGroups}
      cornerLabel="Permission"
      cornerSubtitle="Per-user overrides (Role / Allow / Block)"
      columnCount={staff.length}
      columnHeaders={staff.map((s) => {
        const { allowedCount, totalCount } = getUserEffectiveStats(s, roles);
        return (
          <SecurityColumnHeader
            key={s.id}
            name={getStaffDisplayName(s)}
            subtitle={getStaffRoleName(s, roles)}
            allowedCount={allowedCount}
            totalCount={totalCount}
            avatarClassName="bg-cf-accent/10 text-cf-accent ring-1 ring-cf-accent/20"
          />
        );
      })}
      renderRow={(_group, permission) => {
        const isDestructive = isDestructivePermission(permission.key);
        return (
          <tr className="group hover:bg-cf-surface-soft/35">
            <PermissionRowLabel
              permission={permission}
              isDestructive={isDestructive}
              destructivePrefix=""
            />
            {staff.map((s) => (
              <OverrideCell
                key={s.id}
                staff={s}
                permissionKey={permission.key as SecurityPermissionKey}
                roles={roles}
                disabled={disabled}
                saving={savingCellKey === `${s.id}:${permission.key}`}
                onToggle={onToggleUserOverride}
              />
            ))}
          </tr>
        );
      }}
    />
  );
}
