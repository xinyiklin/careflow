import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
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
  type SecurityPermissionKey,
} from "../../constants/securityPermissions";
import PermissionsRolesMatrix from "./PermissionsRolesMatrix";

import type {
  AdminConfirmDialogState,
  AdminSortOption,
  AdminStaff,
  AdminStaffRole,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

type PermissionGroup = (typeof SECURITY_PERMISSION_GROUPS)[number];
type PermissionItem = PermissionGroup["permissions"][number];
type FlexiblePermissionGroup = {
  key: string;
  label: string;
  permissions: readonly PermissionItem[];
};

const ROLE_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (role) => role.is_active !== false,
  },
  {
    key: "system",
    label: "System",
    predicate: (role) => Boolean(role.is_system_role),
  },
  {
    key: "custom",
    label: "Custom",
    predicate: (role) => !role.is_system_role,
  },
] satisfies AdminListFilter<AdminStaffRole>[];

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
      compareBoolean(Boolean(a.is_system_role), Boolean(b.is_system_role)) ||
      compareText(a.name, b.name),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(a.name, b.name),
  },
] satisfies AdminSortOption<AdminStaffRole>[];

const DEFAULT_CONFIRM_DIALOG: AdminConfirmDialogState = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "warning",
  onConfirm: null,
};

function getStaffRoleId(record: AdminStaff) {
  return (
    (typeof record?.role === "object" && record.role ? record.role.id : null) ||
    record?.role_id ||
    record?.role
  );
}

function getStaffCounts(staffs: AdminStaff[]) {
  const counts = new Map<string, number>();
  staffs.forEach((staff) => {
    const roleId = getStaffRoleId(staff);
    if (!roleId) return;
    const key = String(roleId);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function permissionMatchesSearch(
  group: FlexiblePermissionGroup,
  permission: PermissionItem,
  query: string
) {
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

function getCellKey(roleId: string | number, permissionKey: string) {
  return `${roleId}:${permissionKey}`;
}

export default function PermissionsRolesPanel() {
  const { adminFacility } = useAdminFacility();
  const { roles = [], staffs = [] } = useAdminFacilityConfig(adminFacility?.id);
  const adminRoles = roles as AdminStaffRole[];
  const adminStaff = staffs as AdminStaff[];
  const [query, setQuery] = useState("");
  const [savingCellKey, setSavingCellKey] = useState("");
  const [confirmDialogState, setConfirmDialogState] = useState(
    DEFAULT_CONFIRM_DIALOG
  );
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
  } = useAdminListControls(adminRoles, {
    filters: ROLE_FILTERS,
    sortOptions: ROLE_SORT_OPTIONS,
    defaultSort: "system",
  });

  const visibleRoles = useMemo(() => filteredRoles, [filteredRoles]);

  const visiblePermissionGroups = useMemo<
    readonly FlexiblePermissionGroup[]
  >(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return SECURITY_PERMISSION_GROUPS;

    return SECURITY_PERMISSION_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        permissionMatchesSearch(group, permission, trimmedQuery)
      ),
    })).filter((group) => group.permissions.length > 0);
  }, [query]);

  const staffCounts = useMemo(() => getStaffCounts(adminStaff), [adminStaff]);

  const closeConfirmDialog = () => {
    setConfirmDialogState(DEFAULT_CONFIRM_DIALOG);
  };

  const applyRoleSecurityChange = async (
    role: AdminStaffRole,
    permissionKey: SecurityPermissionKey,
    isAllowed: boolean
  ) => {
    const cellKey = getCellKey(role.id, permissionKey);

    const securityPermissions = {
      ...normalizeSecurityPermissions(role.security_permissions || undefined),
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

  const handleConfirmDialogConfirm = async () => {
    if (!confirmDialogState.onConfirm) return;
    await confirmDialogState.onConfirm();
    closeConfirmDialog();
  };

  const handleRoleSecurityChange = async (
    role: AdminStaffRole,
    permission: PermissionItem,
    isAllowed: boolean
  ) => {
    if (role.is_system_role) {
      setConfirmDialogState({
        isOpen: true,
        title: `Change ${role.name} permissions?`,
        message: `This role is a protected system role. Changing "${permission.label}" will affect every ${role.name} assigned to this facility. Confirm only if this is intentional.`,
        confirmText: isAllowed ? "Allow Permission" : "Block Permission",
        cancelText: "Keep Current",
        variant: "warning",
        onConfirm: () =>
          applyRoleSecurityChange(role, permission.key, isAllowed),
      });
      return;
    }

    await applyRoleSecurityChange(role, permission.key, isAllowed);
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
      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        variant={confirmDialogState.variant}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}
