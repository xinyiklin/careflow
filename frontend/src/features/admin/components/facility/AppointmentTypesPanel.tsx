import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminListControls, {
  compareBoolean,
  compareNumber,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useAppointmentTypes from "../../hooks/facility/useAppointmentTypes";
import AppointmentTypeModal from "./AppointmentTypeModal";
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
  AdminAppointmentType,
  AdminConfirmDialogState,
  AdminSavePayload,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

const TYPE_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (type) => type.is_active !== false,
  },
  {
    key: "inactive",
    label: "Inactive",
    predicate: (type) => type.is_active === false,
  },
  {
    key: "protected",
    label: "Protected",
    predicate: (type) => !type.is_deletable,
  },
] satisfies AdminListFilter<AdminAppointmentType>[];

const TYPE_SORT_OPTIONS = [
  {
    key: "name",
    label: "Type",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "duration",
    label: "Duration",
    compare: (a, b) =>
      compareNumber(a.duration_minutes, b.duration_minutes) ||
      compareText(a.name, b.name),
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
] satisfies AdminSortOption<AdminAppointmentType>[];

export default function AppointmentTypesPanel() {
  const { adminFacility } = useAdminFacility();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<AdminAppointmentType | null>(
    null
  );
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
  const {
    appointmentTypes,
    loading,
    saving,
    error,
    reload,
    saveAppointmentType,
    removeAppointmentType,
  } = useAppointmentTypes(canManageCurrentFacility ? adminFacility?.id : null);
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visibleAppointmentTypes,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(appointmentTypes, {
    filters: TYPE_FILTERS,
    sortOptions: TYPE_SORT_OPTIONS,
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
    setEditingType(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (type: AdminAppointmentType) => {
    setEditingType(type);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setEditingType(null);
    setIsModalOpen(false);
  };
  const handleSave = async (values: AdminSavePayload["values"]) => {
    await saveAppointmentType({ id: editingType?.id || null, values });
    handleCloseModal();
  };
  const handleDelete = () => {
    if (!editingType?.id) return;
    if (editingType.is_deletable) {
      openConfirmDialog({
        title: "Delete Appointment Type",
        message:
          "Are you sure you want to delete this appointment type? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "danger",
        onConfirm: async () => {
          await removeAppointmentType(editingType.id);
          handleCloseModal();
        },
      });
      return;
    }
    openConfirmDialog({
      title: "Cannot Delete Appointment Type",
      message:
        "This is a protected default appointment type and cannot be deleted. You can mark it as inactive instead.",
      confirmText: "Mark Inactive",
      cancelText: "Cancel",
      variant: "warning",
      onConfirm: async () => {
        await saveAppointmentType({
          id: editingType.id,
          values: {
            code: editingType.code,
            name: editingType.name,
            color: editingType.color,
            duration_minutes: editingType.duration_minutes,
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
            ? `Control duration defaults and scheduling labels for ${adminFacility.name}.`
            : "Select a facility to manage appointment types."
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
              <Plus className="h-3.5 w-3.5" /> New Type
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={TYPE_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["Type", "Code", "Duration", "Color", "State"].map(
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
                    Loading appointment types...
                  </td>
                </tr>
              ) : appointmentTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No appointment types found yet. Add one to start shaping
                    your scheduling templates.
                  </td>
                </tr>
              ) : visibleAppointmentTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No appointment types match the selected filter.
                  </td>
                </tr>
              ) : (
                visibleAppointmentTypes.map((type) => (
                  <tr
                    key={type.id}
                    {...getAdminRowActionProps({
                      disabled: !canManageCurrentFacility,
                      label: `Edit appointment type ${type.name || type.code}`,
                      onAction: () => handleOpenEdit(type),
                    })}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid h-9 w-9 place-items-center rounded-xl text-[11px] font-semibold text-white"
                          style={{ backgroundColor: type.color || "#94a3b8" }}
                        >
                          {(type.name || "TY").slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-semibold text-cf-text">
                            {type.name}
                          </div>
                          <div className="text-[11px] text-cf-text-muted">
                            {type.is_deletable
                              ? "Custom type"
                              : "Protected default type"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="neutral">{type.code}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline">
                        {type.duration_minutes} min
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cf-border bg-cf-surface px-3 py-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-cf-border"
                          style={{ backgroundColor: type.color || "#94a3b8" }}
                        />
                        <span className="text-sm font-medium text-cf-text-muted">
                          {type.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={type.is_active ? "success" : "muted"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={visibleAppointmentTypes.length}
          total={appointmentTypes.length}
          label="types"
        />
      </AdminTableCard>

      <AppointmentTypeModal
        isOpen={isModalOpen}
        mode={editingType ? "edit" : "create"}
        initialValues={editingType}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        onDelete={editingType ? handleDelete : undefined}
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
