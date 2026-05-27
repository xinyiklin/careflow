import { useState } from "react";
import { FileSpreadsheet, Plus, RefreshCw } from "lucide-react";

import { Badge, Button } from "../../../../shared/components/ui";
import useOrganizationFeeSchedule from "../../hooks/organization/useOrganizationFeeSchedule";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  AdminTableLoadError,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import useAdminListControls, {
  compareNumber,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import FeeScheduleSheetModal from "./FeeScheduleSheetModal";

import type {
  AdminOrganizationFeeSchedule,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

function getLinkedLabel(schedule: AdminOrganizationFeeSchedule) {
  if (!schedule.linked_entities) return "—";
  const parts: string[] = [];
  const { facilities, staff, payers } = schedule.linked_entities;
  if (facilities?.length)
    parts.push(
      `${facilities.length} facilit${facilities.length === 1 ? "y" : "ies"}`
    );
  if (staff?.length) parts.push(`${staff.length} staff`);
  if (payers?.length)
    parts.push(`${payers.length} payer${payers.length === 1 ? "" : "s"}`);
  return parts.join(", ") || "—";
}

const SHEET_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (s) => s.is_active !== false,
  },
  {
    key: "default",
    label: "Default",
    predicate: (s) => s.is_default === true,
  },
  {
    key: "inactive",
    label: "Inactive",
    predicate: (s) => s.is_active === false,
  },
] satisfies AdminListFilter<AdminOrganizationFeeSchedule>[];

function getLinkedCount(schedule: AdminOrganizationFeeSchedule) {
  if (!schedule.linked_entities) return 0;
  const { facilities, staff, payers } = schedule.linked_entities;
  return (
    (facilities?.length || 0) + (staff?.length || 0) + (payers?.length || 0)
  );
}

const SHEET_SORT_OPTIONS = [
  {
    key: "name",
    label: "Name",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "code",
    label: "Code",
    compare: (a, b) =>
      compareText(a.code, b.code) || compareText(a.name, b.name),
  },
  {
    key: "fees",
    label: "Fee count",
    compare: (a, b) =>
      compareNumber(b.item_count, a.item_count) || compareText(a.name, b.name),
  },
  {
    key: "linked",
    label: "Most linked",
    compare: (a, b) =>
      compareNumber(getLinkedCount(b), getLinkedCount(a)) ||
      compareText(a.name, b.name),
  },
] satisfies AdminSortOption<AdminOrganizationFeeSchedule>[];

export default function OrganizationFeeSchedulePanel() {
  const {
    schedules,
    items,
    loading,
    saving,
    error,
    loadError,
    reload,
    saveSchedule,
    saveItem,
    populateFromCatalog,
  } = useOrganizationFeeSchedule();

  const [editingSchedule, setEditingSchedule] =
    useState<AdminOrganizationFeeSchedule | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  const controls = useAdminListControls(schedules, {
    filters: SHEET_FILTERS,
    sortOptions: SHEET_SORT_OPTIONS,
    defaultSort: "name",
    storageKey: "organizationFeeScheduleSheets",
  });

  const openSheetModal = (schedule: AdminOrganizationFeeSchedule | null) => {
    setEditingSchedule(schedule);
    setIsSheetModalOpen(true);
  };

  const closeSheetModal = () => {
    setEditingSchedule(null);
    setIsSheetModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {error && !loadError ? (
        <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>
      ) : null}

      <AdminTableCard>
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={controls.filterOptions}
          activeFilter={controls.activeFilter}
          onFilterChange={controls.setActiveFilter}
          sortOptions={SHEET_SORT_OPTIONS}
          activeSort={controls.activeSort}
          onSortChange={controls.setActiveSort}
          actions={
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => void reload()}
                disabled={loading || saving}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openSheetModal(null)}
                disabled={saving}
              >
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["Name", "Code", "Fees", "Linked To", "Status"].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-3 text-left">
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border text-cf-text">
              {loading ? null : loadError ? (
                <AdminTableLoadError
                  colSpan={5}
                  message="Couldn't load fee schedule sheets."
                  onRetry={() => void reload()}
                />
              ) : schedules.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No fee schedule sheets yet.
                  </td>
                </tr>
              ) : controls.visibleRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No sheets match the selected filter.
                  </td>
                </tr>
              ) : (
                controls.visibleRecords.map((schedule) => (
                  <tr
                    key={schedule.id}
                    {...getAdminRowActionProps({
                      label: `Edit ${schedule.name || "sheet"}`,
                      onAction: () => openSheetModal(schedule),
                    })}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-cf-accent/12 text-[11px] font-semibold text-cf-accent ring-1 ring-cf-accent/20">
                          <FileSpreadsheet className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-semibold text-cf-text">
                            {schedule.name}
                          </div>
                          {schedule.is_default && (
                            <span className="text-[10px] text-cf-accent font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-cf-text-muted">
                      {schedule.code || "—"}
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {Number(schedule.item_count ?? 0)}
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted text-xs">
                      {getLinkedLabel(schedule)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          schedule.is_active === false ? "muted" : "success"
                        }
                      >
                        {schedule.is_active === false ? "Inactive" : "Active"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={controls.visibleRecords.length}
          total={schedules.length}
          label="sheets"
        />
      </AdminTableCard>

      <FeeScheduleSheetModal
        isOpen={isSheetModalOpen}
        schedule={editingSchedule}
        items={items}
        saving={saving}
        onClose={closeSheetModal}
        onSaveSchedule={saveSchedule}
        onSaveItem={saveItem}
        onReload={reload}
        onPopulate={populateFromCatalog}
      />
    </div>
  );
}
