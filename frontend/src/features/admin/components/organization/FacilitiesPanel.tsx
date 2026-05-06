import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import useAdminListControls, {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useOrganizationFacilities from "../../hooks/organization/useOrganizationFacilities";
import FacilityModal from "./FacilityModal";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import { Badge, Button } from "../../../../shared/components/ui";
import type {
  AdminFacility,
  AdminSavePayload,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

const FACILITY_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (facility) => facility.is_active !== false,
  },
  {
    key: "inactive",
    label: "Inactive",
    predicate: (facility) => facility.is_active === false,
  },
  {
    key: "email",
    label: "With email",
    predicate: (facility) => Boolean(facility.email),
  },
] satisfies AdminListFilter<AdminFacility>[];

const FACILITY_SORT_OPTIONS = [
  {
    key: "name",
    label: "Facility",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "code",
    label: "Code",
    compare: (a, b) =>
      compareText(a.facility_code, b.facility_code) ||
      compareText(a.name, b.name),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(a.name, b.name),
  },
] satisfies AdminSortOption<AdminFacility>[];

export default function FacilitiesPanel() {
  const { facilities, loading, saving, error, reload, saveFacility } =
    useOrganizationFacilities();
  const adminFacilities = facilities as AdminFacility[];
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visibleFacilities,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(adminFacilities, {
    filters: FACILITY_FILTERS,
    sortOptions: FACILITY_SORT_OPTIONS,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<AdminFacility | null>(
    null
  );

  const handleOpenCreate = () => {
    setEditingFacility(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (facility: AdminFacility) => {
    setEditingFacility(facility);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingFacility(null);
    setIsModalOpen(false);
  };

  const handleSave = async (values: AdminSavePayload["values"]) => {
    await saveFacility({ id: editingFacility?.id || null, values });
    handleCloseModal();
  };

  return (
    <div className="space-y-4">
      {error && <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>}

      <AdminTableCard
        description="Manage facilities within the organization."
        savingLabel={saving ? "Saving..." : ""}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => reload()}
              disabled={loading || saving}
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
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" />
              New Facility
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={FACILITY_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["Facility", "Phone", "Profile", "Status"].map(
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
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    Loading facilities...
                  </td>
                </tr>
              ) : adminFacilities.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No facilities found yet. Add one to start configuring the
                    organization footprint.
                  </td>
                </tr>
              ) : visibleFacilities.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No facilities match the selected filter.
                  </td>
                </tr>
              ) : (
                visibleFacilities.map((facility) => (
                  <tr
                    key={facility.id}
                    {...getAdminRowActionProps({
                      label: `Edit facility ${facility.name || facility.id}`,
                      onAction: () => handleOpenEdit(facility),
                    })}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-cf-accent/12 text-[11px] font-semibold text-cf-accent ring-1 ring-cf-accent/20">
                          {facility.name
                            ?.split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part.charAt(0))
                            .join("")
                            .toUpperCase() || "FC"}
                        </span>
                        <div>
                          <div className="font-semibold text-cf-text">
                            {facility.name}
                          </div>
                          <div className="text-[11px] text-cf-text-muted">
                            {facility.facility_code
                              ? `Code: ${facility.facility_code}`
                              : "Organization facility"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      <div>{facility.phone_number || "—"}</div>
                      <div className="mt-1 text-xs text-cf-text-subtle">
                        {facility.fax_number
                          ? `Fax: ${facility.fax_number}`
                          : "No fax"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      <div>{facility.timezone || "—"}</div>
                      <div className="mt-1 text-xs text-cf-text-subtle">
                        {facility.email || "No email yet"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          facility.is_active !== false ? "success" : "muted"
                        }
                      >
                        {facility.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={visibleFacilities.length}
          total={facilities.length}
          label="facilities"
        />
      </AdminTableCard>

      <FacilityModal
        isOpen={isModalOpen}
        mode={editingFacility ? "edit" : "create"}
        initialValues={editingFacility}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
      />
    </div>
  );
}
