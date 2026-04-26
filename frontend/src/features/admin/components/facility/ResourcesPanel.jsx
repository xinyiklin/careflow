import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminListControls, {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useResources from "../../hooks/facility/useResources";
import ResourceModal from "./ResourceModal";
import {
  getResourceHoursLabel,
  getResourceRoomLabel,
} from "./resourceScheduleUtils";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import { Badge, Button } from "../../../../shared/components/ui";

const RESOURCE_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (resource) => resource.is_active !== false,
  },
  {
    key: "archived",
    label: "Archived",
    predicate: (resource) => resource.is_active === false,
  },
  {
    key: "unlinked",
    label: "Unlinked",
    predicate: (resource) => !resource.linked_staff,
  },
];

const RESOURCE_SORT_OPTIONS = [
  {
    key: "name",
    label: "Resource",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(a.name, b.name),
  },
  {
    key: "linked",
    label: "Linked staff",
    compare: (a, b) =>
      compareBoolean(a.linked_staff, b.linked_staff) ||
      compareText(a.linked_staff_name, b.linked_staff_name) ||
      compareText(a.name, b.name),
  },
];

export default function ResourcesPanel() {
  const { adminFacility } = useAdminFacility();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
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
  const {
    resources,
    loading,
    saving,
    error,
    reload,
    saveResource,
    removeResource,
  } = useResources(canManageCurrentFacility ? adminFacility.id : null);
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visibleResources,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(resources, {
    filters: RESOURCE_FILTERS,
    sortOptions: RESOURCE_SORT_OPTIONS,
  });
  const duplicateResourceNames = useMemo(() => {
    const counts = resources.reduce((nextCounts, resource) => {
      const name = (resource.name || "Unnamed resource").trim().toLowerCase();
      nextCounts.set(name, (nextCounts.get(name) || 0) + 1);
      return nextCounts;
    }, new Map());

    return counts;
  }, [resources]);

  const openConfirmDialog = (options) =>
    setConfirmDialogState({ isOpen: true, ...options });
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
    setEditingResource(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (resource) => {
    setEditingResource(resource);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setEditingResource(null);
    setIsModalOpen(false);
  };
  const handleSave = async (values) => {
    await saveResource({ id: editingResource?.id || null, values });
    handleCloseModal();
  };
  const handleDelete = () => {
    if (!editingResource?.id) return;

    openConfirmDialog({
      title: "Deactivate Resource",
      message:
        "This will hide the resource from active scheduling while preserving existing appointment history. Continue?",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      variant: "warning",
      onConfirm: async () => {
        await removeResource(editingResource.id);
        handleCloseModal();
      },
    });
  };

  return (
    <div className="space-y-4">
      {!canManageCurrentFacility ? (
        <AdminInlineNotice>
          You do not have admin access to the currently selected facility.
        </AdminInlineNotice>
      ) : null}
      {error ? (
        <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>
      ) : null}

      <AdminTableCard
        description={
          adminFacility?.name
            ? `Manage schedulable resources for ${adminFacility.name}.`
            : "Select a facility to manage resources."
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
              <Plus className="h-3.5 w-3.5" />
              New Resource
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={RESOURCE_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["Resource", "Linked staff", "Room", "Hours", "Status"].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-3 text-left">
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
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    Loading resources...
                  </td>
                </tr>
              ) : resources.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No resources found yet. Add one to start organizing your
                    schedule lanes.
                  </td>
                </tr>
              ) : visibleResources.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No resources match the selected filter.
                  </td>
                </tr>
              ) : (
                visibleResources.map((resource) => {
                  const normalizedResourceName = (
                    resource.name || "Unnamed resource"
                  )
                    .trim()
                    .toLowerCase();
                  const hasDuplicateName =
                    (duplicateResourceNames.get(normalizedResourceName) || 0) >
                    1;

                  return (
                    <tr
                      key={resource.id}
                      {...getAdminRowActionProps({
                        disabled: !canManageCurrentFacility,
                        label: `Edit resource ${resource.name || resource.id}`,
                        onAction: () => handleOpenEdit(resource),
                        className: !resource.linked_staff
                          ? "bg-amber-50/30"
                          : "",
                      })}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-[11px] font-semibold text-blue-800">
                            {resource.name
                              ?.split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part.charAt(0))
                              .join("")
                              .toUpperCase() || "RS"}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 font-semibold text-cf-text">
                              <span>{resource.name}</span>
                              {hasDuplicateName ? (
                                <span className="rounded-full bg-cf-surface-soft px-1.5 py-0.5 text-[10px] font-semibold text-cf-text-subtle ring-1 ring-cf-border">
                                  #{resource.id}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-cf-text-muted">
                              {hasDuplicateName
                                ? `Resource #${resource.id} · `
                                : ""}
                              {resource.is_deletable
                                ? "Custom resource"
                                : "Physician-linked resource"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        {resource.linked_staff_name ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-purple-100 text-[10px] font-semibold text-purple-800">
                              {resource.linked_staff_name
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part) => part.charAt(0))
                                .join("")
                                .toUpperCase()}
                            </span>
                            {resource.linked_staff_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/60 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/60">
                            Unlinked
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        {getResourceRoomLabel(resource)}
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        {getResourceHoursLabel(resource, adminFacility)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            resource.is_active !== false ? "success" : "muted"
                          }
                        >
                          {resource.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={visibleResources.length}
          total={resources.length}
          label="resources"
        />
      </AdminTableCard>

      <ResourceModal
        isOpen={isModalOpen}
        mode={editingResource ? "edit" : "create"}
        initialValues={editingResource}
        facility={adminFacility}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        onDelete={editingResource ? handleDelete : undefined}
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
