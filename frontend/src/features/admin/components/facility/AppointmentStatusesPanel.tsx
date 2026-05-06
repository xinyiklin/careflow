import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminListControls, {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useAppointmentStatuses from "../../hooks/facility/useAppointmentStatuses";
import AppointmentStatusModal from "./AppointmentStatusModal";
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
  AdminAppointmentStatus,
  AdminConfirmDialogState,
  AdminSavePayload,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

const STATUS_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (status) => status.is_active !== false,
  },
  {
    key: "inactive",
    label: "Inactive",
    predicate: (status) => status.is_active === false,
  },
  {
    key: "protected",
    label: "Protected",
    predicate: (status) => !status.is_deletable,
  },
] satisfies AdminListFilter<AdminAppointmentStatus>[];

const STATUS_SORT_OPTIONS = [
  {
    key: "name",
    label: "Status",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "code",
    label: "Code",
    compare: (a, b) => compareText(a.code, b.code),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(a.name, b.name),
  },
  {
    key: "protected",
    label: "Protected first",
    compare: (a, b) =>
      compareBoolean(!a.is_deletable, !b.is_deletable) ||
      compareText(a.name, b.name),
  },
] satisfies AdminSortOption<AdminAppointmentStatus>[];

export default function AppointmentStatusesPanel() {
  const { adminFacility } = useAdminFacility();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] =
    useState<AdminAppointmentStatus | null>(null);
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
  const { statuses, loading, saving, error, reload, saveStatus, removeStatus } =
    useAppointmentStatuses(canManageCurrentFacility ? adminFacility?.id : null);
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visibleStatuses,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(statuses, {
    filters: STATUS_FILTERS,
    sortOptions: STATUS_SORT_OPTIONS,
  });

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
    setEditingStatus(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (s: AdminAppointmentStatus) => {
    setEditingStatus(s);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setEditingStatus(null);
    setIsModalOpen(false);
  };
  const handleSave = async (values: AdminSavePayload["values"]) => {
    await saveStatus({ id: editingStatus?.id || null, values });
    handleCloseModal();
  };
  const handleDelete = () => {
    if (!editingStatus?.id) return;
    if (editingStatus.is_deletable) {
      openConfirmDialog({
        title: "Delete Appointment Status",
        message:
          "Are you sure you want to delete this appointment status? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "danger",
        onConfirm: async () => {
          await removeStatus(editingStatus.id);
          handleCloseModal();
        },
      });
      return;
    }
    openConfirmDialog({
      title: "Cannot Delete Appointment Status",
      message:
        "This is a protected default status and cannot be deleted. You can mark it as inactive instead.",
      confirmText: "Mark Inactive",
      cancelText: "Cancel",
      variant: "warning",
      onConfirm: async () => {
        await saveStatus({
          id: editingStatus.id,
          values: {
            code: editingStatus.code,
            name: editingStatus.name,
            color: editingStatus.color,
            is_active: false,
          },
        });
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
            ? `Scheduler status labels and colors for ${adminFacility.name}.`
            : "Select a facility to manage scheduler statuses."
        }
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
              <Plus className="h-3.5 w-3.5" /> New Status
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={STATUS_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["Status", "Code", "Color", "State"].map((heading, index) => (
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
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    Loading statuses...
                  </td>
                </tr>
              ) : statuses.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No statuses found yet.
                  </td>
                </tr>
              ) : visibleStatuses.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No statuses match the selected filter.
                  </td>
                </tr>
              ) : (
                visibleStatuses.map((status) => (
                  <tr
                    key={status.id}
                    {...getAdminRowActionProps({
                      disabled: !canManageCurrentFacility,
                      label: `Edit appointment status ${status.name || status.code}`,
                      onAction: () => handleOpenEdit(status),
                    })}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid h-9 w-9 place-items-center rounded-xl text-[11px] font-semibold text-white"
                          style={{ backgroundColor: status.color || "#94a3b8" }}
                        >
                          {(status.name || "ST").slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-semibold text-cf-text">
                            {status.name}
                          </div>
                          <div className="text-[11px] text-cf-text-muted">
                            {status.is_deletable
                              ? "Custom status"
                              : "Protected default"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="neutral">{status.code}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cf-border bg-cf-surface px-3 py-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-cf-border"
                          style={{ backgroundColor: status.color || "#94a3b8" }}
                        />
                        <span className="text-sm font-medium text-cf-text-muted">
                          {status.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={status.is_active ? "success" : "muted"}>
                        {status.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={visibleStatuses.length}
          total={statuses.length}
          label="statuses"
        />
      </AdminTableCard>

      <AppointmentStatusModal
        isOpen={isModalOpen}
        mode={editingStatus ? "edit" : "create"}
        initialValues={editingStatus}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        onDelete={editingStatus ? handleDelete : undefined}
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
