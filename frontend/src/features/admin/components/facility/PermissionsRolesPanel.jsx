import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminFacilityConfig from "../../hooks/facility/useAdminFacilityConfig";
import useAdminListControls, {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useStaffRoleSecurity from "../../hooks/facility/useStaffRoleSecurity";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
} from "../shared/AdminSurface";
import {
  SECURITY_PERMISSION_GROUPS,
  normalizeSecurityPermissions,
} from "../../constants/securityPermissions";
import PermissionsRolesMatrix from "./PermissionsRolesMatrix";

const ROLE_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (role) => role.is_active !== false,
  },
  { key: "system", label: "System", predicate: (role) => role.is_system_role },
  { key: "custom", label: "Custom", predicate: (role) => !role.is_system_role },
];

const ROLE_SORT_OPTIONS = [
  {
    key: "name",
    label: "Role",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "system",
    label: "System first",
    compare: (a, b) =>
      compareBoolean(a.is_system_role, b.is_system_role) ||
      compareText(a.name, b.name),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(a.name, b.name),
  },
];

function getStaffRoleId(record) {
  return record?.role?.id || record?.role_id || record?.role;
}

function getStaffCounts(staffs) {
  const counts = new Map();
  staffs.forEach((staff) => {
    const roleId = getStaffRoleId(staff);
    if (!roleId) return;
    const key = String(roleId);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function permissionMatchesSearch(group, permission, query) {
  if (!query) return true;
  const haystack = [
    group.label,
    group.key,
    permission.label,
    permission.key,
    permission.key.includes(".delete") ? "delete destructive audited" : "",
    permission.key.includes(".manage") ? "manage sensitive audited" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function getCellKey(roleId, permissionKey) {
  return `${roleId}:${permissionKey}`;
}

export default function PermissionsRolesPanel() {
  const { adminFacility } = useAdminFacility();
  const { roles = [], staffs = [] } = useAdminFacilityConfig(adminFacility?.id);
  const [query, setQuery] = useState("");
  const [savingCellKey, setSavingCellKey] = useState("");
  const canManageCurrentFacility = Boolean(adminFacility?.id);
  const { saving, error, updateRoleSecurity } = useStaffRoleSecurity(
    canManageCurrentFacility ? adminFacility?.id : null
  );
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: filteredRoles,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(roles, {
    filters: ROLE_FILTERS,
    sortOptions: ROLE_SORT_OPTIONS,
    defaultSort: "system",
  });

  const visibleRoles = useMemo(() => filteredRoles, [filteredRoles]);

  const visiblePermissionGroups = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return SECURITY_PERMISSION_GROUPS;

    return SECURITY_PERMISSION_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        permissionMatchesSearch(group, permission, trimmedQuery)
      ),
    })).filter((group) => group.permissions.length > 0);
  }, [query]);

  const staffCounts = useMemo(() => getStaffCounts(staffs), [staffs]);

  const handleRoleSecurityChange = async (role, permissionKey, isAllowed) => {
    if (role.is_system_role) return;
    const cellKey = getCellKey(role.id, permissionKey);

    const securityPermissions = {
      ...normalizeSecurityPermissions(role.security_permissions),
      [permissionKey]: isAllowed,
    };

    setSavingCellKey(cellKey);

    try {
      await updateRoleSecurity(role.id, {
        security_permissions: securityPermissions,
      });
    } finally {
      setSavingCellKey("");
    }
  };

  return (
    <div className="space-y-4">
      {!canManageCurrentFacility && (
        <AdminInlineNotice>
          Select a facility to manage role permissions.
        </AdminInlineNotice>
      )}
      {error && <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>}

      <AdminTableCard>
        <AdminListToolbar
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={ROLE_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        >
          <label className="flex h-8 items-center gap-2 rounded-full border border-cf-border bg-cf-surface px-3 text-xs font-semibold text-cf-text-muted">
            <Search className="h-3.5 w-3.5 text-cf-text-subtle" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-40 bg-transparent outline-none placeholder:text-cf-text-subtle"
              aria-label="Search permission rows"
            />
          </label>
        </AdminListToolbar>

        {visibleRoles.length && visiblePermissionGroups.length ? (
          <PermissionsRolesMatrix
            disabled={saving || !canManageCurrentFacility}
            groups={visiblePermissionGroups}
            roles={visibleRoles}
            savingCellKey={savingCellKey}
            staffCounts={staffCounts}
            onToggle={handleRoleSecurityChange}
          />
        ) : (
          <div className="p-4">
            <div className="rounded-2xl border border-dashed border-cf-border px-5 py-10 text-center text-sm text-cf-text-muted">
              {visibleRoles.length
                ? "No permission rows match your search."
                : "No roles match the selected filter."}
            </div>
          </div>
        )}
      </AdminTableCard>
    </div>
  );
}
