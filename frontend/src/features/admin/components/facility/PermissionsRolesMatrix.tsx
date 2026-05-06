import { Fragment } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { normalizeSecurityPermissions } from "../../constants/securityPermissions";

import type { SECURITY_PERMISSION_GROUPS } from "../../constants/securityPermissions";
import type { AdminStaffRole } from "../../types";

type PermissionGroup = (typeof SECURITY_PERMISSION_GROUPS)[number];
type PermissionItem = PermissionGroup["permissions"][number];
type FlexiblePermissionGroup = {
  key: string;
  label: string;
  permissions: readonly PermissionItem[];
};

function getInitials(name: string | null | undefined = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "R";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getRoleStats(role: AdminStaffRole) {
  const permissions = normalizeSecurityPermissions(
    role?.security_permissions || undefined
  );
  const allowedCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  return {
    permissions,
    allowedCount,
    totalCount,
    allowedPercent: Math.round((allowedCount / Math.max(totalCount, 1)) * 100),
  };
}

function isDestructivePermission(permissionKey: string) {
  return (
    permissionKey.includes(".delete") ||
    permissionKey.includes(".manage") ||
    permissionKey.includes("admin.")
  );
}

function RoleHeader({
  role,
  staffCount,
}: {
  role: AdminStaffRole;
  staffCount: number;
}) {
  const { allowedCount, totalCount, allowedPercent } = getRoleStats(role);

  return (
    <th
      className={[
        "min-w-[190px] border-b border-cf-border bg-cf-surface px-3 py-3 text-left align-top",
        role.is_system_role ? "bg-cf-surface-soft/55" : "",
      ].join(" ")}
    >
      <div className="rounded-2xl p-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-cf-border bg-cf-surface-soft text-[10px] font-bold text-cf-text-muted">
            {getInitials(role.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-cf-text">
                {role.name || "Role"}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-medium text-cf-text-subtle">
              {role.is_system_role ? "System" : "Custom"} · {staffCount} staff
            </span>
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cf-border">
            <div
              className="h-full rounded-full bg-cf-success-text"
              style={{ width: `${allowedPercent}%` }}
            />
          </div>
          <span className="font-mono text-[10px] font-semibold text-cf-text-muted">
            {allowedCount}/{totalCount}
          </span>
        </div>
      </div>
    </th>
  );
}

function PermissionStateButton({
  disabled,
  isAllowed,
  requiresConfirmation,
  isSaving,
  onToggle,
}: {
  disabled: boolean;
  isAllowed: boolean;
  requiresConfirmation: boolean;
  isSaving: boolean;
  onToggle: () => void;
}) {
  const label = isAllowed ? "Allow" : "Block";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={isAllowed}
      title={
        requiresConfirmation
          ? `Click to ${isAllowed ? "block" : "allow"} after confirmation`
          : `Click to ${isAllowed ? "block" : "allow"}`
      }
      className={[
        "inline-flex min-w-[84px] items-center justify-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
        isAllowed
          ? "border-cf-success-text/20 bg-cf-success-bg text-cf-success-text"
          : "border-cf-border bg-cf-surface-soft text-cf-text-subtle",
        disabled
          ? "cursor-not-allowed opacity-65"
          : "hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]",
      ].join(" ")}
    >
      {requiresConfirmation ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <span
          className={[
            "h-2.5 w-2.5 rounded-full",
            isAllowed ? "bg-cf-success-text" : "bg-cf-border-strong",
          ].join(" ")}
        />
      )}
      {isSaving ? "Saving" : label}
    </button>
  );
}

function PermissionGroupHeader({
  group,
  colSpan,
}: {
  group: FlexiblePermissionGroup;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b border-cf-border bg-cf-surface-soft/60 px-4 py-2"
      >
        <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            {group.label}
          </span>
          <span className="font-mono normal-case tracking-normal">
            {group.permissions.length} permissions
          </span>
        </div>
      </td>
    </tr>
  );
}

function PermissionRow({
  group,
  permission,
  roles,
  savingCellKey,
  disabled,
  onToggle,
}: {
  group: FlexiblePermissionGroup;
  permission: PermissionItem;
  roles: AdminStaffRole[];
  savingCellKey: string;
  disabled: boolean;
  onToggle: (
    role: AdminStaffRole,
    permission: PermissionItem,
    isAllowed: boolean
  ) => void;
}) {
  const isDestructive = isDestructivePermission(permission.key);

  return (
    <tr className="group hover:bg-cf-surface-soft/35">
      <th className="sticky left-0 z-[5] border-r border-b border-cf-border bg-cf-surface px-4 py-3 text-left group-hover:bg-cf-surface-soft">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-cf-text">
            {permission.label}
          </span>
          {isDestructive ? (
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          ) : null}
        </div>
        <div
          className={[
            "mt-0.5 font-mono text-[10px]",
            isDestructive ? "text-rose-700" : "text-cf-text-subtle",
          ].join(" ")}
        >
          {isDestructive ? "sensitive · audited · " : ""}
          {permission.key}
        </div>
      </th>
      {roles.map((role) => {
        const permissions = normalizeSecurityPermissions(
          role.security_permissions || undefined
        );
        const requiresConfirmation = Boolean(role.is_system_role);
        const cellKey = `${role.id}:${permission.key}`;
        const isCellSaving = savingCellKey === cellKey;
        return (
          <td
            key={`${group.key}-${permission.key}-${role.id}`}
            className={[
              "border-b border-cf-border px-3 py-2 text-center",
              requiresConfirmation ? "bg-cf-surface-soft/40" : "",
            ].join(" ")}
          >
            <PermissionStateButton
              disabled={disabled}
              isAllowed={permissions[permission.key]}
              requiresConfirmation={requiresConfirmation}
              isSaving={isCellSaving}
              onToggle={() =>
                onToggle(role, permission, !permissions[permission.key])
              }
            />
          </td>
        );
      })}
    </tr>
  );
}

export default function PermissionsRolesMatrix({
  disabled,
  groups,
  onToggle,
  roles,
  savingCellKey,
  staffCounts,
}: {
  disabled: boolean;
  groups: readonly FlexiblePermissionGroup[];
  onToggle: (
    role: AdminStaffRole,
    permission: PermissionItem,
    isAllowed: boolean
  ) => void;
  roles: AdminStaffRole[];
  savingCellKey: string;
  staffCounts: Map<string, number>;
}) {
  return (
    <div className="min-h-[420px]">
      <div className="min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-cf-surface">
              <tr>
                <th className="sticky left-0 z-20 w-[250px] border-r border-b border-cf-border bg-cf-surface px-4 py-3 text-left align-top">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                    Permission
                  </div>
                  <div className="mt-0.5 text-xs text-cf-text-muted">
                    System-role changes require confirmation
                  </div>
                </th>
                {roles.map((role) => (
                  <RoleHeader
                    key={role.id}
                    role={role}
                    staffCount={staffCounts.get(String(role.id)) || 0}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <PermissionGroupHeader
                    key={`${group.key}-header`}
                    group={group}
                    colSpan={roles.length + 1}
                  />
                  {group.permissions.map((permission) => (
                    <PermissionRow
                      key={permission.key}
                      group={group}
                      permission={permission}
                      roles={roles}
                      savingCellKey={savingCellKey}
                      disabled={disabled}
                      onToggle={onToggle}
                    />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
