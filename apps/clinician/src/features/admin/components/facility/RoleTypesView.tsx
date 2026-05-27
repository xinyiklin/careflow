import { Plus } from "lucide-react";

import { normalizeSecurityPermissions } from "../../constants/securityPermissions";
import RoleTypeCard from "../shared/RoleTypeCard";

import type { AdminStaffRole } from "../../types";

export default function RoleTypesView({
  roles,
  staffCounts,
  disabled = false,
  onEditRole,
  onAddRole,
}: {
  roles: AdminStaffRole[];
  staffCounts: Map<string, number>;
  disabled?: boolean;
  onEditRole?: (role: AdminStaffRole) => void;
  onAddRole?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
      {roles.map((role) => {
        const permissions = normalizeSecurityPermissions(
          role.security_permissions || undefined
        );
        const allowedCount = Object.values(permissions).filter(Boolean).length;
        const totalCount = Object.keys(permissions).length;

        return (
          <RoleTypeCard
            key={role.id}
            name={role.name || "Untitled Role"}
            code={role.code || undefined}
            description={role.description || undefined}
            typeBadge={role.is_system_role ? "System" : "Custom"}
            memberCount={staffCounts.get(String(role.id)) || 0}
            memberLabel="staff"
            allowedCount={allowedCount}
            totalPermissions={totalCount}
            onEdit={onEditRole ? () => onEditRole(role) : undefined}
          />
        );
      })}
      {onAddRole && (
        <button
          type="button"
          onClick={onAddRole}
          disabled={disabled}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cf-border bg-cf-surface/50 py-10 text-cf-text-muted transition hover:border-cf-accent/40 hover:bg-cf-accent/5 hover:text-cf-accent disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">Add Role</span>
        </button>
      )}
    </div>
  );
}
