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
import { getResourceHoursLabel } from "./resourceScheduleUtils";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import { Badge, Button } from "../../../../shared/components/ui";

function isPhysicianStaff(staffRecord) {
  const roleCode = staffRecord.role?.code || staffRecord.role_code || "";
  const roleName = staffRecord.role?.name || staffRecord.role_name || "";
  return (
    roleCode.toLowerCase() === "physician" ||
    roleName.toLowerCase() === "physician"
  );
}

function getStaffDisplayName(record) {
  return record.user
    ? `${record.user.first_name || ""} ${record.user.last_name || ""}`.trim() ||
        record.user.username
    : "";
}

const PHYSICIAN_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (record) => record.is_active !== false,
  },
  {
    key: "titled",
    label: "With title",
    predicate: (record) => record.title_name || record.title?.name,
  },
];

const PHYSICIAN_SORT_OPTIONS = [
  {
    key: "name",
    label: "Physician",
    compare: (a, b) =>
      compareText(getStaffDisplayName(a), getStaffDisplayName(b)),
  },
  {
    key: "role",
    label: "Role",
    compare: (a, b) =>
      compareText(a.role_name || a.role?.name, b.role_name || b.role?.name) ||
      compareText(getStaffDisplayName(a), getStaffDisplayName(b)),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(getStaffDisplayName(a), getStaffDisplayName(b)),
  },
];

export default function PhysiciansPanel() {
  const { memberships } = useFacility();
  const { adminFacility } = useAdminFacility();
  const { roles = [], titles = [] } = useAdminFacilityConfig(adminFacility?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhysician, setEditingPhysician] = useState(null);
  const [confirmDialogState, setConfirmDialogState] = useState({
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

  const physicians = useMemo(() => staff.filter(isPhysicianStaff), [staff]);
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visiblePhysicians,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(physicians, {
    filters: PHYSICIAN_FILTERS,
    sortOptions: PHYSICIAN_SORT_OPTIONS,
  });
  const physicianRoles = useMemo(
    () =>
      roles.filter((r) => {
        const c = r.code || "";
        const n = r.name || "";
        return (
          c.toLowerCase() === "physician" || n.toLowerCase() === "physician"
        );
      }),
    [roles]
  );
  const availableUsers = useMemo(() => {
    const map = new Map();
    (memberships || []).forEach((m) => {
      if (m.user?.id && !map.has(m.user.id)) map.set(m.user.id, m.user);
    });
    return Array.from(map.values());
  }, [memberships]);

  const openConfirmDialog = (opts) =>
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
    setEditingPhysician(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (r) => {
    setEditingPhysician(r);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setEditingPhysician(null);
    setIsModalOpen(false);
  };
  const handleSave = async (values) => {
    await saveStaff({ id: editingPhysician?.id || null, values });
    handleCloseModal();
  };
  const handleDelete = () => {
    if (!editingPhysician?.id) return;
    openConfirmDialog({
      title: "Remove Physician",
      message:
        "Are you sure you want to remove this physician from the current facility?",
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await removeStaff(editingPhysician.id);
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
        description={
          adminFacility?.name
            ? `Manage physician assignments for ${adminFacility.name}.`
            : "Select a facility to manage physicians."
        }
        savingLabel={saving ? "Saving..." : ""}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={reload}
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
              <Plus className="h-3.5 w-3.5" /> New Physician
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={PHYSICIAN_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {[
                  "Physician",
                  "Contact",
                  "Role",
                  "Title",
                  "Hours",
                  "Status",
                ].map((heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    className="px-5 py-3 text-left"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border text-cf-text">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    Loading physicians...
                  </td>
                </tr>
              ) : physicians.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No physicians found yet.
                  </td>
                </tr>
              ) : visiblePhysicians.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No physicians match the selected filter.
                  </td>
                </tr>
              ) : (
                visiblePhysicians.map((r) => (
                  <tr
                    key={r.id}
                    {...getAdminRowActionProps({
                      disabled: !canManageCurrentFacility,
                      label: `Edit physician ${
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
                              r.user.username
                            : "MD"
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
                            {r.user?.username || "Physician assignment"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      <div>{r.user?.email || "—"}</div>
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {r.role_name || r.role?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {r.title_name || r.title?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {getResourceHoursLabel(
                        {
                          operating_start_time: r.resource_operating_start_time,
                          operating_end_time: r.resource_operating_end_time,
                        },
                        adminFacility
                      )}
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
          shown={visiblePhysicians.length}
          total={physicians.length}
          label="physicians"
        />
      </AdminTableCard>

      <StaffModal
        isOpen={isModalOpen}
        mode={editingPhysician ? "edit" : "create"}
        initialValues={editingPhysician}
        roles={physicianRoles}
        titles={titles}
        users={availableUsers}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        onDelete={editingPhysician ? handleDelete : undefined}
        recordLabel="Physician"
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
