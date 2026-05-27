import { useState } from "react";
import { AlertTriangle, Search } from "lucide-react";

import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import { SegmentedControl } from "../../../../shared/components/ui";
import {
  ORGANIZATION_PERMISSION_GROUPS,
  ORGANIZATION_PERMISSION_KEYS,
} from "../../constants/organizationPermissions";
import {
  isDestructivePermission,
  filterPermissionGroups,
  type PermissionItem,
} from "../../constants/permissionUtils";
import useOrganizationSecurity from "../../hooks/organization/useOrganizationSecurity";
import { AdminInlineNotice, AdminTableCard } from "../shared/AdminSurface";
import PermissionMatrixShell from "../shared/PermissionMatrixShell";
import PermissionRowLabel from "../shared/PermissionRowLabel";
import SecurityColumnHeader from "../shared/SecurityColumnHeader";
import OrgRoleModal from "./OrgRoleModal";
import OrganizationRoleTypesView from "./OrganizationRoleTypesView";

import type { AdminConfirmDialogState, AdminSavePayload } from "../../types";
import type { OrgSecurityRole } from "../../api/organization/security";

type ViewMode = "permissions" | "role-types";

const VIEW_MODE_OPTIONS = [
  { value: "permissions" as const, label: "Permissions" },
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

function getRoleStats(role: OrgSecurityRole) {
  const perms = role.security_permissions || {};
  const allowedCount = Object.values(perms).filter(Boolean).length;
  return { allowedCount, totalCount: ORGANIZATION_PERMISSION_KEYS.length };
}

export default function OrganizationSecurityPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>("permissions");
  const [query, setQuery] = useState("");
  const [savingCellKey, setSavingCellKey] = useState("");
  const [confirmDialogState, setConfirmDialogState] = useState(
    DEFAULT_CONFIRM_DIALOG
  );

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [roleModalRecord, setRoleModalRecord] =
    useState<OrgSecurityRole | null>(null);

  const {
    roles,
    loading,
    error,
    saving,
    updateRoleSecurity,
    createRole,
    updateRole,
    deleteRole,
  } = useOrganizationSecurity();

  const visibleGroups = filterPermissionGroups(
    ORGANIZATION_PERMISSION_GROUPS,
    query
  );

  const closeConfirmDialog = () =>
    setConfirmDialogState(DEFAULT_CONFIRM_DIALOG);

  const applyPermissionChange = async (
    role: OrgSecurityRole,
    permissionKey: string,
    isAllowed: boolean
  ) => {
    const cellKey = `${role.key}:${permissionKey}`;
    setSavingCellKey(cellKey);
    try {
      await updateRoleSecurity({
        role: role.key,
        security_permissions: {
          ...role.security_permissions,
          [permissionKey]: isAllowed,
        },
      });
    } finally {
      setSavingCellKey("");
    }
  };

  const handleToggle = (
    role: OrgSecurityRole,
    permission: PermissionItem,
    isAllowed: boolean
  ) => {
    setConfirmDialogState({
      isOpen: true,
      title: `Change ${role.label} permissions?`,
      message: `Changing "${permission.label}" will affect every ${role.label} in this organization. Confirm only if this is intentional.`,
      confirmText: isAllowed ? "Allow Permission" : "Block Permission",
      cancelText: "Keep Current",
      variant: "warning",
      onConfirm: () => applyPermissionChange(role, permission.key, isAllowed),
    });
  };

  const handleConfirmDialogConfirm = async () => {
    if (!confirmDialogState.onConfirm) return;
    await confirmDialogState.onConfirm();
    closeConfirmDialog();
  };

  const handleOpenCreateRole = () => {
    setRoleModalRecord(null);
    setRoleModalMode("create");
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: OrgSecurityRole) => {
    setRoleModalRecord(role);
    setRoleModalMode("edit");
    setRoleModalOpen(true);
  };

  const handleRoleModalSubmit = async (values: AdminSavePayload["values"]) => {
    if (roleModalMode === "create") {
      await createRole(values);
    } else if (roleModalRecord?.id) {
      await updateRole(roleModalRecord.id, values);
    }
    setRoleModalOpen(false);
  };

  const handleRoleModalDelete = () => {
    if (!roleModalRecord?.id) return;
    const role = roleModalRecord;
    const isDeletable = role.is_deletable !== false;
    setRoleModalOpen(false);
    setConfirmDialogState({
      isOpen: true,
      title: isDeletable
        ? `Delete "${role.label}"?`
        : `Deactivate "${role.label}"?`,
      message: isDeletable
        ? `This will permanently remove the "${role.label}" role. Members assigned to this role will need to be reassigned.`
        : `This role cannot be deleted because it is a default role. It will be deactivated instead.`,
      confirmText: isDeletable ? "Delete Role" : "Deactivate",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteRole(role.id!);
      },
    });
  };

  return (
    <div className="space-y-4">
      {error && <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>}

      <AdminTableCard
        actions={
          <>
            <SegmentedControl
              options={VIEW_MODE_OPTIONS}
              value={viewMode}
              onChange={setViewMode}
              size="xs"
            />
            {viewMode === "permissions" && (
              <label className="flex h-7 items-center gap-2 rounded-lg border border-cf-border bg-cf-surface px-2.5 text-xs text-cf-text-muted">
                <Search className="h-3.5 w-3.5 text-cf-text-subtle" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-32 bg-transparent text-xs outline-none placeholder:text-cf-text-subtle"
                  aria-label="Search permissions"
                />
              </label>
            )}
          </>
        }
      >
        {viewMode === "role-types" ? (
          <OrganizationRoleTypesView
            roles={roles}
            loading={loading}
            disabled={saving}
            onEditRole={handleOpenEditRole}
            onAddRole={handleOpenCreateRole}
          />
        ) : roles.length && visibleGroups.length ? (
          <PermissionMatrixShell
            groups={visibleGroups}
            cornerLabel="Organization Permission"
            cornerSubtitle="Changes apply to all members of the role"
            columnCount={roles.length}
            groupHeaderIconClassName="text-cf-accent"
            columnHeaders={roles.map((role) => {
              const { allowedCount, totalCount } = getRoleStats(role);
              return (
                <SecurityColumnHeader
                  key={role.key}
                  name={role.label}
                  subtitle={`System · ${role.member_count} members`}
                  allowedCount={allowedCount}
                  totalCount={totalCount}
                />
              );
            })}
            renderRow={(_group, permission) => {
              const isDestructive = isDestructivePermission(permission.key);
              return (
                <tr className="group hover:bg-cf-surface-soft/30 border-b border-cf-border">
                  <PermissionRowLabel
                    permission={permission}
                    isDestructive={isDestructive}
                    destructivePrefix="administrative · sensitive · "
                  />
                  {roles.map((role) => {
                    const isAllowed = Boolean(
                      role.security_permissions?.[permission.key]
                    );
                    const cellKey = `${role.key}:${permission.key}`;
                    const isCellSaving = savingCellKey === cellKey;
                    return (
                      <td
                        key={role.key}
                        className="px-5 py-3.5 text-center align-middle border-l border-cf-border/60"
                      >
                        <button
                          type="button"
                          disabled={saving || loading}
                          onClick={() =>
                            handleToggle(role, permission, !isAllowed)
                          }
                          className={[
                            "inline-flex min-w-[84px] items-center justify-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
                            isAllowed
                              ? "border-cf-success-text/20 bg-cf-success-bg text-cf-success-text"
                              : "border-cf-border bg-cf-surface-soft text-cf-text-subtle",
                            saving || loading
                              ? "cursor-not-allowed opacity-65"
                              : "hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]",
                          ].join(" ")}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {isCellSaving
                            ? "Saving"
                            : isAllowed
                              ? "Allow"
                              : "Block"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            }}
          />
        ) : (
          <div className="p-4">
            <div className="rounded-2xl border border-dashed border-cf-border px-5 py-10 text-center text-sm text-cf-text-muted">
              {loading
                ? "Loading security permissions…"
                : roles.length
                  ? "No permission rows match your search."
                  : "Unable to load organization security roles."}
            </div>
          </div>
        )}
      </AdminTableCard>
      <OrgRoleModal
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
    </div>
  );
}
