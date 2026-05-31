import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import { SegmentedControl } from "../../../../shared/components/ui";
import { useAuth } from "../../../auth/AuthProvider";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminFacilityConfig from "../../hooks/facility/useAdminFacilityConfig";
import {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useStaff from "../../hooks/facility/useStaff";
import useStaffRoleSecurity from "../../hooks/facility/useStaffRoleSecurity";
import { AdminInlineNotice, AdminTableCard } from "../shared/AdminSurface";
import {
  SECURITY_PERMISSION_GROUPS,
  normalizeSecurityPermissions,
  type SecurityPermissionKey,
} from "../../constants/securityPermissions";
import {
  filterPermissionGroups,
  type PermissionGroup,
  type PermissionItem,
} from "../../constants/permissionUtils";
import PermissionsRolesMatrix from "./PermissionsRolesMatrix";
import PermissionsUsersMatrix from "./PermissionsUsersMatrix";
import RoleTypesView from "./RoleTypesView";
import StaffRoleModal from "./StaffRoleModal";

import type {
  AdminConfirmDialogState,
  AdminSavePayload,
  AdminStaff,
  AdminStaffRole,
} from "../../types";

type ViewMode = "roles" | "users" | "role-types";

const VIEW_MODE_OPTIONS = [
  { value: "roles" as const, label: "Roles" },
  { value: "users" as const, label: "Users" },
  { value: "role-types" as const, label: "Role Types" },
] as const;

const DEFAULT_CONFIRM_DIALOG: AdminConfirmDialogState = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "warning",
  onConfirm: null,
};

// Permissions that, if removed from your own role/profile, would lock you out
// of administration or the security panel. Editing these for yourself is hard
// blocked — no bypass — rather than surfaced as a dismissable banner.
const LOCKOUT_PERMISSIONS: Record<string, string> = {
  "admin.facility.manage": "facility administration",
  "admin.security.manage": "the security panel",
};

const DEFAULT_BLOCKED_DIALOG = { isOpen: false, title: "", message: "" };

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

function getCellKey(roleId: string | number, permissionKey: string) {
  return `${roleId}:${permissionKey}`;
}

export default function SecurityPanel() {
  const { adminFacility } = useAdminFacility();
  const { roles = [], staffs = [] } = useAdminFacilityConfig(adminFacility?.id);
  const adminRoles = roles as AdminStaffRole[];
  const adminStaff = staffs as AdminStaff[];
  const [viewMode, setViewMode] = useState<ViewMode>("roles");
  const [query, setQuery] = useState("");
  const [savingCellKey, setSavingCellKey] = useState("");
  const [userOverrideSaving, setUserOverrideSaving] = useState(false);
  const [confirmDialogState, setConfirmDialogState] = useState(
    DEFAULT_CONFIRM_DIALOG
  );
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [roleModalRecord, setRoleModalRecord] = useState<AdminStaffRole | null>(
    null
  );

  const canManageCurrentFacility = Boolean(adminFacility?.id);
  const { saving, error, updateRoleSecurity, createRole, deleteRole } =
    useStaffRoleSecurity(canManageCurrentFacility ? adminFacility?.id : null);
  const {
    saving: staffSaving,
    error: staffError,
    saveStaff,
  } = useStaff(canManageCurrentFacility ? adminFacility?.id : null);

  const activeRoles = useMemo(
    () =>
      (adminRoles as AdminStaffRole[])
        .filter((r) => r.is_active !== false)
        .sort(
          (a, b) =>
            compareBoolean(
              Boolean(a.is_system_role),
              Boolean(b.is_system_role)
            ) || compareText(a.name, b.name)
        ),
    [adminRoles]
  );

  const activeStaff = useMemo(
    () => adminStaff.filter((s) => s.is_active !== false),
    [adminStaff]
  );

  const visiblePermissionGroups = useMemo<readonly PermissionGroup[]>(
    () => filterPermissionGroups(SECURITY_PERMISSION_GROUPS, query),
    [query]
  );

  const staffCounts = useMemo(() => getStaffCounts(adminStaff), [adminStaff]);

  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? null;
  const [blockedDialog, setBlockedDialog] = useState(DEFAULT_BLOCKED_DIALOG);

  const ownRoleId = useMemo(() => {
    if (currentUserId == null) return null;
    const own = adminStaff.find(
      (s) => s.user?.id != null && String(s.user.id) === String(currentUserId)
    );
    return own ? getStaffRoleId(own) : null;
  }, [adminStaff, currentUserId]);

  const isSelfStaff = (staff: AdminStaff) =>
    currentUserId != null &&
    staff.user?.id != null &&
    String(staff.user.id) === String(currentUserId);

  const resolveRolePermissions = (staff: AdminStaff) => {
    const roleId = getStaffRoleId(staff);
    const match = adminRoles.find((r) => String(r.id) === String(roleId));
    return normalizeSecurityPermissions(
      match?.security_permissions || undefined
    );
  };

  const blockSelfLockout = (permissionKey: string) => {
    setBlockedDialog({
      isOpen: true,
      title: "You can't remove your own access",
      message: `This change would remove your own access to ${LOCKOUT_PERMISSIONS[permissionKey]} and lock you out. Grant this permission to another role or user first, or ask another administrator to make the change.`,
    });
  };

  const closeBlockedDialog = () => setBlockedDialog(DEFAULT_BLOCKED_DIALOG);

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
    if (
      permission.key in LOCKOUT_PERMISSIONS &&
      !isAllowed &&
      ownRoleId != null &&
      String(role.id) === String(ownRoleId)
    ) {
      blockSelfLockout(permission.key);
      return;
    }

    await applyRoleSecurityChange(
      role,
      permission.key as SecurityPermissionKey,
      isAllowed
    );
  };

  const handleToggleUserOverride = async (
    staff: AdminStaff,
    permissionKey: SecurityPermissionKey,
    mode: "inherit" | "grant" | "revoke"
  ) => {
    if (permissionKey in LOCKOUT_PERMISSIONS && isSelfStaff(staff)) {
      const wouldLockOut =
        mode === "revoke" ||
        (mode === "inherit" && !resolveRolePermissions(staff)[permissionKey]);
      if (wouldLockOut) {
        blockSelfLockout(permissionKey);
        return;
      }
    }

    const currentOverrides = { ...(staff.security_overrides || {}) };

    if (mode === "inherit") {
      delete currentOverrides[permissionKey];
    } else {
      currentOverrides[permissionKey] = mode === "grant";
    }

    setUserOverrideSaving(true);
    try {
      await saveStaff({
        id: staff.id,
        values: { security_overrides: currentOverrides },
      });
    } finally {
      setUserOverrideSaving(false);
    }
  };

  const handleOpenCreateRole = () => {
    setRoleModalRecord(null);
    setRoleModalMode("create");
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: AdminStaffRole) => {
    setRoleModalRecord(role);
    setRoleModalMode("edit");
    setRoleModalOpen(true);
  };

  const handleRoleModalSubmit = async (values: AdminSavePayload["values"]) => {
    if (roleModalMode === "create") {
      await createRole(values);
    } else if (roleModalRecord) {
      await updateRoleSecurity(roleModalRecord.id, values);
    }
    setRoleModalOpen(false);
  };

  const handleRoleModalDelete = () => {
    if (!roleModalRecord) return;
    const role = roleModalRecord;
    const isDeletable = role.is_deletable !== false;
    setRoleModalOpen(false);
    setConfirmDialogState({
      isOpen: true,
      title: isDeletable
        ? `Delete "${role.name}"?`
        : `Deactivate "${role.name}"?`,
      message: isDeletable
        ? `This will permanently remove the "${role.name}" role. Staff assigned to this role will need to be reassigned.`
        : `This role cannot be deleted because it is a default role. It will be deactivated instead.`,
      confirmText: isDeletable ? "Delete Role" : "Deactivate",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteRole(role.id);
      },
    });
  };

  return (
    <div className="space-y-4">
      {!canManageCurrentFacility && (
        <AdminInlineNotice>
          Select a facility to manage security permissions.
        </AdminInlineNotice>
      )}
      {(error || staffError) && (
        <AdminInlineNotice tone="danger">
          {error || staffError}
        </AdminInlineNotice>
      )}

      <AdminTableCard
        actions={
          <>
            <SegmentedControl
              options={VIEW_MODE_OPTIONS}
              value={viewMode}
              onChange={setViewMode}
              size="xs"
            />
            <label className="flex h-7 items-center gap-2 rounded-lg border border-cf-border bg-cf-surface px-2.5 text-xs text-cf-text-muted">
              <Search className="h-3.5 w-3.5 text-cf-text-subtle" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search…"
                className="w-32 bg-transparent text-xs outline-none placeholder:text-cf-text-subtle"
                aria-label="Search permissions"
              />
            </label>
          </>
        }
      >
        {viewMode === "role-types" ? (
          <RoleTypesView
            roles={activeRoles}
            staffCounts={staffCounts}
            disabled={saving || !canManageCurrentFacility}
            onEditRole={
              canManageCurrentFacility ? handleOpenEditRole : undefined
            }
            onAddRole={
              canManageCurrentFacility ? handleOpenCreateRole : undefined
            }
          />
        ) : viewMode === "roles" ? (
          activeRoles.length && visiblePermissionGroups.length ? (
            <PermissionsRolesMatrix
              disabled={saving || !canManageCurrentFacility}
              groups={visiblePermissionGroups}
              roles={activeRoles}
              savingCellKey={savingCellKey}
              staffCounts={staffCounts}
              onToggle={handleRoleSecurityChange}
            />
          ) : (
            <div className="p-4">
              <div className="rounded-2xl border border-dashed border-cf-border px-5 py-10 text-center text-sm text-cf-text-muted">
                {activeRoles.length
                  ? "No permission rows match your search."
                  : "No active roles in this facility."}
              </div>
            </div>
          )
        ) : (
          <PermissionsUsersMatrix
            staff={activeStaff}
            roles={adminRoles}
            disabled={
              staffSaving || userOverrideSaving || !canManageCurrentFacility
            }
            saving={userOverrideSaving}
            query={query}
            onToggleUserOverride={handleToggleUserOverride}
          />
        )}
      </AdminTableCard>
      <StaffRoleModal
        isOpen={roleModalOpen}
        mode={roleModalMode}
        initialValues={roleModalRecord}
        saving={saving}
        onClose={() => setRoleModalOpen(false)}
        onSubmit={handleRoleModalSubmit}
        onDelete={roleModalMode === "edit" ? handleRoleModalDelete : undefined}
      />
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
      <ConfirmDialog
        isOpen={blockedDialog.isOpen}
        title={blockedDialog.title}
        message={blockedDialog.message}
        confirmText="OK"
        variant="danger"
        hideCancel
        onConfirm={closeBlockedDialog}
        onCancel={closeBlockedDialog}
      />
    </div>
  );
}
