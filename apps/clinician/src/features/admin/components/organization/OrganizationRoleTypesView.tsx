import { Plus } from "lucide-react";

import { ORGANIZATION_PERMISSION_KEYS } from "../../constants/organizationPermissions";
import useMinimumLoading from "../../../../shared/hooks/useMinimumLoading";
import RoleTypeCard from "../shared/RoleTypeCard";

import type { OrgSecurityRole } from "../../api/organization/security";

export default function OrganizationRoleTypesView({
  roles,
  loading = false,
  disabled = false,
  onEditRole,
  onAddRole,
}: {
  roles: OrgSecurityRole[];
  loading?: boolean;
  disabled?: boolean;
  onEditRole?: (role: OrgSecurityRole) => void;
  onAddRole?: () => void;
}) {
  const showLoading = useMinimumLoading(loading);

  if (showLoading) {
    return (
      <div className="rounded-2xl border border-dashed border-cf-border px-5 py-10 text-center text-sm text-cf-text-muted">
        Loading role types…
      </div>
    );
  }

  if (loading) {
    return null;
  }

  if (roles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cf-border px-5 py-10 text-center text-sm text-cf-text-muted">
        No organization roles found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
      {roles.map((role) => {
        const allowedCount = Object.values(
          role.security_permissions || {}
        ).filter(Boolean).length;

        return (
          <RoleTypeCard
            key={role.key}
            name={role.label}
            code={role.key}
            description={role.description}
            typeBadge={role.is_system_role ? "System" : "Custom"}
            memberCount={role.member_count}
            memberLabel="members"
            allowedCount={allowedCount}
            totalPermissions={ORGANIZATION_PERMISSION_KEYS.length}
            onEdit={
              onEditRole && role.key !== "owner"
                ? () => onEditRole(role)
                : undefined
            }
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
