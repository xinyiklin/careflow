import { type FormEvent, useState } from "react";
import { Copy, FileSpreadsheet, RefreshCw } from "lucide-react";

import { Badge, Button } from "../../../../shared/components/ui";
import ModalShell from "../../../../shared/components/ui/ModalShell";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminListControls, {
  compareNumber,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useFacilityFeeSchedule from "../../hooks/facility/useFacilityFeeSchedule";
import useOrganizationFeeSchedule from "../../hooks/organization/useOrganizationFeeSchedule";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  AdminTableLoadError,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import FeeScheduleSheetModal from "../organization/FeeScheduleSheetModal";

import type {
  AdminOrganizationFeeSchedule,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";
import type { EntityId } from "../../../../shared/api/types";

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
] satisfies AdminListFilter<AdminOrganizationFeeSchedule>[];

const SHEET_SORT_OPTIONS = [
  {
    key: "name",
    label: "Name",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "fees",
    label: "Fee count",
    compare: (a, b) =>
      compareNumber(b.item_count, a.item_count) || compareText(a.name, b.name),
  },
  {
    key: "source",
    label: "Source",
    compare: (a, b) =>
      compareText(a.source_schedule_name, b.source_schedule_name) ||
      compareText(a.name, b.name),
  },
] satisfies AdminSortOption<AdminOrganizationFeeSchedule>[];

function CopyFromOrgModal({
  isOpen,
  orgSchedules,
  saving,
  onClose,
  onCopy,
}: {
  isOpen: boolean;
  orgSchedules: AdminOrganizationFeeSchedule[];
  saving: boolean;
  onClose: () => void;
  onCopy: (sourceId: EntityId) => Promise<unknown>;
}) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    await onCopy(selectedId);
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Fee schedule"
      title="Copy from Organization"
      maxWidth="lg"
      panelClassName="cf-admin-record-modal rounded-[var(--radius-cf-shell)] border-cf-border-strong bg-cf-surface shadow-[var(--shadow-panel-lg)] [&>div:first-child_p]:hidden"
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60"
      footerClassName="justify-between bg-cf-surface"
      footer={
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="default"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="copy-org-schedule-form"
            disabled={!selectedId || saving}
          >
            {saving ? "Copying..." : "Copy Schedule"}
          </Button>
        </div>
      }
    >
      <form id="copy-org-schedule-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="space-y-3">
          <p className="text-sm text-cf-text-muted">
            Select an organization fee schedule to copy. This creates an
            independent copy that you can modify without affecting the original.
          </p>
          {orgSchedules.length === 0 ? (
            <p className="py-6 text-center text-sm text-cf-text-muted">
              No organization fee schedules available.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto rounded-xl border border-cf-border divide-y divide-cf-border">
              {orgSchedules
                .filter((s) => s.is_active !== false)
                .map((schedule) => (
                  <button
                    key={schedule.id}
                    type="button"
                    className={[
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      String(selectedId) === String(schedule.id)
                        ? "bg-cf-accent/8 ring-1 ring-inset ring-cf-accent/30"
                        : "hover:bg-cf-surface-soft",
                    ].join(" ")}
                    onClick={() => setSelectedId(schedule.id)}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cf-accent/12 text-cf-accent">
                      <FileSpreadsheet className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-cf-text truncate">
                        {schedule.name}
                      </div>
                      <div className="text-xs text-cf-text-muted">
                        {Number(schedule.item_count ?? 0)} codes
                        {schedule.is_default ? " · Default" : ""}
                      </div>
                    </div>
                    {String(selectedId) === String(schedule.id) && (
                      <span className="text-xs font-semibold text-cf-accent">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}

export default function FacilityFeeSchedulePanel() {
  const { adminFacility } = useAdminFacility();
  const facilityId = adminFacility?.id || null;

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
    copyFromOrg,
    populateFromCatalog,
  } = useFacilityFeeSchedule(facilityId);

  const { schedules: orgSchedules } = useOrganizationFeeSchedule();

  const [editingSchedule, setEditingSchedule] =
    useState<AdminOrganizationFeeSchedule | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const controls = useAdminListControls(schedules, {
    filters: SHEET_FILTERS,
    sortOptions: SHEET_SORT_OPTIONS,
    defaultSort: "name",
    storageKey: "facilityFeeScheduleSheets",
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
      {!facilityId ? (
        <AdminInlineNotice>
          Select a facility to manage fee schedules.
        </AdminInlineNotice>
      ) : null}
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
                disabled={loading || saving || !facilityId}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCopyModalOpen(true)}
                disabled={saving || !facilityId}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy from Organization
              </Button>
            </>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["Name", "Source", "Fees", "Status"].map((heading) => (
                  <th key={heading} className="px-3 py-3 text-left">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border text-cf-text">
              {loading ? null : loadError ? (
                <AdminTableLoadError
                  colSpan={4}
                  message="Couldn't load facility fee schedules."
                  onRetry={() => void reload()}
                />
              ) : schedules.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-12 text-center text-sm text-cf-text-muted"
                  >
                    <div className="space-y-2">
                      <p>No facility fee schedules yet.</p>
                      <p className="text-xs">
                        Use "Copy from Organization" to create one from an
                        existing org schedule.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : controls.visibleRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No schedules match the selected filter.
                  </td>
                </tr>
              ) : (
                controls.visibleRecords.map((schedule) => (
                  <tr
                    key={schedule.id}
                    {...getAdminRowActionProps({
                      label: `Edit ${schedule.name || "schedule"}`,
                      onAction: () => openSheetModal(schedule),
                    })}
                  >
                    <td className="px-3 py-4">
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
                    <td className="px-3 py-4 text-xs text-cf-text-muted">
                      {schedule.source_schedule_name
                        ? `Copied from ${schedule.source_schedule_name}`
                        : "—"}
                    </td>
                    <td className="px-3 py-4 text-cf-text-muted">
                      {Number(schedule.item_count ?? 0)}
                    </td>
                    <td className="px-3 py-4">
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
          label="schedules"
        />
      </AdminTableCard>

      <FeeScheduleSheetModal
        isOpen={isSheetModalOpen}
        schedule={editingSchedule}
        items={items}
        saving={saving}
        onClose={closeSheetModal}
        onSaveSchedule={async (payload) => {
          if (!payload.id) return;
          await saveSchedule(payload);
        }}
        onSaveItem={saveItem}
        onReload={reload}
        onPopulate={populateFromCatalog}
      />

      <CopyFromOrgModal
        isOpen={isCopyModalOpen}
        orgSchedules={orgSchedules}
        saving={saving}
        onClose={() => setIsCopyModalOpen(false)}
        onCopy={copyFromOrg}
      />
    </div>
  );
}
