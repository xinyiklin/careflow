import { AlertTriangle } from "lucide-react";

import { normalizeSecurityPermissions } from "../../constants/securityPermissions";
import {
  isDestructivePermission,
  type PermissionGroup,
  type PermissionItem,
} from "../../constants/permissionUtils";
import SecurityColumnHeader from "../shared/SecurityColumnHeader";
import PermissionMatrixShell from "../shared/PermissionMatrixShell";
import PermissionRowLabel from "../shared/PermissionRowLabel";

import type { AdminStaffRole } from "../../types";

function getRoleStats(role: AdminStaffRole) {
  const permissions = normalizeSecurityPermissions(
    role?.security_permissions || undefined
  );
  const allowedCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  return { permissions, allowedCount, totalCount };
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

export default function PermissionsRolesMatrix({
  disabled,
  groups,
  onToggle,
  roles,
  savingCellKey,
  staffCounts,
}: {
  disabled: boolean;
  groups: readonly PermissionGroup[];
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
    <PermissionMatrixShell
      groups={groups}
      cornerLabel="Permission"
      cornerSubtitle="System-role changes require confirmation"
      columnCount={roles.length}
      columnHeaders={roles.map((role) => {
        const { allowedCount, totalCount } = getRoleStats(role);
        return (
          <SecurityColumnHeader
            key={role.id}
            name={role.name || "Role"}
            subtitle={`${role.is_system_role ? "System" : "Custom"} · ${staffCounts.get(String(role.id)) || 0} staff`}
            allowedCount={allowedCount}
            totalCount={totalCount}
            className={role.is_system_role ? "bg-cf-surface-soft/55" : ""}
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
            />
            {roles.map((role) => {
              const permissions = normalizeSecurityPermissions(
                role.security_permissions || undefined
              );
              const requiresConfirmation = Boolean(role.is_system_role);
              const cellKey = `${role.id}:${permission.key}`;
              const isCellSaving = savingCellKey === cellKey;
              return (
                <td
                  key={role.id}
                  className={[
                    "border-b border-cf-border px-3 py-2 text-center",
                    requiresConfirmation ? "bg-cf-surface-soft/40" : "",
                  ].join(" ")}
                >
                  <PermissionStateButton
                    disabled={disabled}
                    isAllowed={
                      permissions[permission.key as keyof typeof permissions]
                    }
                    requiresConfirmation={requiresConfirmation}
                    isSaving={isCellSaving}
                    onToggle={() =>
                      onToggle(
                        role,
                        permission,
                        !permissions[permission.key as keyof typeof permissions]
                      )
                    }
                  />
                </td>
              );
            })}
          </tr>
        );
      }}
    />
  );
}
