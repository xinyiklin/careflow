import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import useFacility from "../../../facilities/hooks/useFacility";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminFacilityConfig from "../../hooks/facility/useAdminFacilityConfig";
import useAdminListControls, {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useStaff from "../../hooks/facility/useStaff";
import StaffModal from "./StaffModal";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import { Badge, Button } from "../../../../shared/components/ui";

import type {
  AdminConfirmDialogState,
  AdminSavePayload,
  AdminSortOption,
  AdminStaff,
  AdminStaffRole,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";
import type { EntityId } from "../../../../shared/api/types";
import type { UserProfile } from "../../../../shared/types/domain";

function getRoleField(
  role: AdminStaff["role"],
  field: "code" | "name"
): string {
  return typeof role === "object" && role ? String(role[field] || "") : "";
}

function getTitleName(title: AdminStaff["title"]): string {
  return typeof title === "object" && title ? String(title.name || "") : "";
}

function isPhysicianStaff(staffRecord: AdminStaff) {
  const roleCode =
    getRoleField(staffRecord.role, "code") || staffRecord.role_code || "";
  const roleName =
    getRoleField(staffRecord.role, "name") || staffRecord.role_name || "";
  return (
    roleCode.toLowerCase() === "physician" ||
    roleName.toLowerCase() === "physician"
  );
}

function getStaffDisplayName(record: AdminStaff) {
  return record.user
    ? `${record.user.first_name || ""} ${record.user.last_name || ""}`.trim() ||
        record.user.username
    : "";
}

const STAFF_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (record) => record.is_active !== false,
  },
  {
    key: "titled",
    label: "With title",
    predicate: (record) =>
      Boolean(
        record.title_name ||
        (typeof record.title === "object" && record.title?.name)
      ),
  },
] satisfies AdminListFilter<AdminStaff>[];

const STAFF_SORT_OPTIONS = [
  {
    key: "name",
    label: "Staff",
    compare: (a, b) =>
      compareText(getStaffDisplayName(a), getStaffDisplayName(b)),
  },
  {
    key: "role",
    label: "Role",
    compare: (a, b) =>
      compareText(
        a.role_name || getRoleField(a.role, "name"),
        b.role_name || getRoleField(b.role, "name")
      ) || compareText(getStaffDisplayName(a), getStaffDisplayName(b)),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(getStaffDisplayName(a), getStaffDisplayName(b)),
  },
] satisfies AdminSortOption<AdminStaff>[];

export default function StaffPanel() {
  const { memberships } = useFacility();
  const { adminFacility } = useAdminFacility();
  const { roles = [], titles = [] } = useAdminFacilityConfig(adminFacility?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminStaff | null>(null);
  const [confirmDialogState, setConfirmDialogState] =
    useState<AdminConfirmDialogState>({
      isOpen: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      onConfirm: null,
    });

  const canManageCurrentFacility = Boolean(adminFacility?.id);
  const { staff, loading, saving, error, reload, saveStaff, removeStaff } =
    useStaff(canManageCurrentFacility ? adminFacility?.id : null);

  const nonPhysicianStaff = useMemo(
    () => staff.filter((r) => !isPhysicianStaff(r)),
    [staff]
  );
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visibleStaff,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(nonPhysicianStaff, {
    filters: STAFF_FILTERS,
    sortOptions: STAFF_SORT_OPTIONS,
  });
  const nonPhysicianRoles = useMemo(
    () =>
      (roles as AdminStaffRole[]).filter((r) => {
        const c = r.code || "";
        const n = r.name || "";
        return !(
          c.toLowerCase() === "physician" || n.toLowerCase() === "physician"
        );
      }),
    [roles]
  );
  const availableUsers = useMemo(() => {
    const map = new Map<EntityId, UserProfile>();
    (memberships || []).forEach((membership) => {
      const user = (membership as { user?: UserProfile }).user;
      if (user?.id && !map.has(user.id)) map.set(user.id, user);
    });
    return Array.from(map.values());
  }, [memberships]);

  const openConfirmDialog = (opts: Omit<AdminConfirmDialogState, "isOpen">) =>
    setConfirmDialogState({ isOpen: true, ...opts });
  const closeConfirmDialog = () =>
    setConfirmDialogState({
      isOpen: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      onConfirm: null,
    });
  const handleConfirmDialogConfirm = async () => {
    if (!confirmDialogState.onConfirm) return;
    await confirmDialogState.onConfirm();
    closeConfirmDialog();
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (r: AdminStaff) => {
    setEditingStaff(r);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setEditingStaff(null);
    setIsModalOpen(false);
  };
  const handleSave = async (values: AdminSavePayload["values"]) => {
    await saveStaff({ id: editingStaff?.id || null, values });
    handleCloseModal();
  };
  const handleDelete = () => {
    if (!editingStaff?.id) return;
    openConfirmDialog({
      title: "Remove Staff Member",
      message:
        "Are you sure you want to remove this staff member from the current facility?",
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await removeStaff(editingStaff.id);
        handleCloseModal();
      },
    });
  };

  return (
    <div className="space-y-4">
      {!canManageCurrentFacility && (
        <AdminInlineNotice>
          You do not have admin access to the currently selected facility.
        </AdminInlineNotice>
      )}
      {error && <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>}

      <AdminTableCard
        savingLabel={saving ? "Saving..." : ""}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => reload()}
              disabled={loading || saving || !canManageCurrentFacility}
            >
              <RefreshCw
                className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(
                  " "
                )}
              />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              disabled={!canManageCurrentFacility}
            >
              <Plus className="h-3.5 w-3.5" /> New Staff
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={STAFF_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["Staff", "Contact", "Role", "Title", "Status"].map(
                  (heading, index) => (
                    <th
                      key={`${heading}-${index}`}
                      className="px-5 py-3 text-left"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border text-cf-text">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    Loading staff...
                  </td>
                </tr>
              ) : nonPhysicianStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No staff found yet.
                  </td>
                </tr>
              ) : visibleStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No staff match the selected filter.
                  </td>
                </tr>
              ) : (
                visibleStaff.map((r) => (
                  <tr
                    key={r.id}
                    {...getAdminRowActionProps({
                      disabled: !canManageCurrentFacility,
                      label: `Edit staff member ${
                        r.user
                          ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() ||
                            r.user.username
                          : r.id
                      }`,
                      onAction: () => handleOpenEdit(r),
                    })}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-cf-accent/12 text-[11px] font-semibold text-cf-accent ring-1 ring-cf-accent/20">
                          {(r.user
                            ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() ||
                              r.user.username ||
                              "ST"
                            : "ST"
                          )
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part.charAt(0))
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div>
                          <div className="font-semibold text-cf-text">
                            {r.user
                              ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() ||
                                r.user.username
                              : "—"}
                          </div>
                          <div className="text-[11px] text-cf-text-muted">
                            {r.user?.username || "Staff assignment"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      <div>{r.user?.email || "—"}</div>
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {r.role_name || getRoleField(r.role, "name") || "—"}
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {r.title_name || getTitleName(r.title) || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={r.is_active ? "success" : "muted"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={visibleStaff.length}
          total={nonPhysicianStaff.length}
          label="staff"
        />
      </AdminTableCard>

      <StaffModal
        isOpen={isModalOpen}
        mode={editingStaff ? "edit" : "create"}
        initialValues={editingStaff}
        roles={nonPhysicianRoles}
        titles={titles as Parameters<typeof StaffModal>[0]["titles"]}
        users={availableUsers}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        onDelete={editingStaff ? handleDelete : undefined}
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
