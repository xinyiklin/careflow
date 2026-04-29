import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import { Badge, Button } from "../../../../shared/components/ui";
import useAdminListControls, {
  compareBoolean,
  compareNumber,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useOrganizationPharmacies from "../../hooks/organization/useOrganizationPharmacies";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import OrganizationPharmacyModal from "./OrganizationPharmacyModal";

function formatAddress(address) {
  if (!address?.line_1) return "No address yet";
  return [
    address.line_1,
    address.line_2,
    [address.city, address.state, address.zip_code].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");
}

function getStatusBadge(preference) {
  if (!preference.is_active) return <Badge variant="muted">Inactive</Badge>;
  if (preference.is_hidden) return <Badge variant="warning">Hidden</Badge>;
  if (preference.is_preferred)
    return <Badge variant="success">Preferred</Badge>;
  return <Badge variant="outline">Available</Badge>;
}

function formatDirectorySource(pharmacy) {
  const sourceLabels = {
    custom: "Custom record",
    imported: "Imported record",
    directory: "Directory record",
  };
  return sourceLabels[pharmacy?.source] || "Custom record";
}

function formatDirectoryStatus(pharmacy) {
  const status = pharmacy?.directory_status || "unknown";
  if (status === "active") return "Directory active";
  if (status === "inactive") return "Directory inactive";
  return "Directory not synced";
}

const PHARMACY_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "preferred",
    label: "Preferred",
    predicate: (preference) => preference.is_preferred,
  },
  {
    key: "erx",
    label: "eRx",
    predicate: (preference) => preference.pharmacy?.accepts_erx,
  },
  {
    key: "inactive",
    label: "Inactive",
    predicate: (preference) => !preference.is_active,
  },
];

const PHARMACY_SORT_OPTIONS = [
  {
    key: "name",
    label: "Pharmacy",
    compare: (a, b) => compareText(a.pharmacy?.name, b.pharmacy?.name),
  },
  {
    key: "preferred",
    label: "Preferred first",
    compare: (a, b) =>
      compareBoolean(a.is_preferred, b.is_preferred) ||
      compareText(a.pharmacy?.name, b.pharmacy?.name),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active, b.is_active) ||
      compareText(a.pharmacy?.name, b.pharmacy?.name),
  },
  {
    key: "order",
    label: "Custom order",
    compare: (a, b) =>
      compareNumber(a.sort_order, b.sort_order) ||
      compareText(a.pharmacy?.name, b.pharmacy?.name),
  },
];

export default function OrganizationPharmaciesPanel() {
  const {
    preferences,
    loading,
    saving,
    error,
    reload,
    savePharmacyPreference,
  } = useOrganizationPharmacies();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreference, setEditingPreference] = useState(null);
  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
    onConfirm: null,
  });
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visiblePreferences,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(preferences, {
    filters: PHARMACY_FILTERS,
    sortOptions: PHARMACY_SORT_OPTIONS,
    defaultSort: "order",
  });

  const handleCloseModal = () => {
    setEditingPreference(null);
    setIsModalOpen(false);
  };

  const handleSave = async (values) => {
    await savePharmacyPreference({
      id: editingPreference?.id || null,
      values,
    });
    handleCloseModal();
  };

  const closeConfirmDialog = () => {
    setConfirmDialogState({
      isOpen: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      onConfirm: null,
    });
  };

  const handleDeactivate = () => {
    if (!editingPreference?.id) return;

    setConfirmDialogState({
      isOpen: true,
      title: "Deactivate Pharmacy",
      message:
        "This removes the pharmacy from intake choices for the organization without deleting the global directory record.",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await savePharmacyPreference({
          id: editingPreference.id,
          values: { is_active: false },
        });
        handleCloseModal();
      },
    });
  };

  const handleConfirm = async () => {
    if (!confirmDialogState.onConfirm) return;
    await confirmDialogState.onConfirm();
    closeConfirmDialog();
  };

  return (
    <div className="space-y-4">
      {error ? (
        <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>
      ) : null}

      <AdminTableCard
        description="Manage organization-enabled pharmacies. Custom records remain local now and can be reconciled with an external pharmacy directory later."
        savingLabel={saving ? "Saving..." : ""}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={reload}
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
              onClick={() => {
                setEditingPreference(null);
                setIsModalOpen(true);
              }}
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Pharmacy
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={PHARMACY_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {[
                  "Pharmacy",
                  "Identifiers",
                  "Contact",
                  "Address",
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
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    Loading pharmacies...
                  </td>
                </tr>
              ) : preferences.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No organization pharmacies yet. Add common pharmacies to
                    make them available during patient intake and pharmacy
                    preference workflows.
                  </td>
                </tr>
              ) : visiblePreferences.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No pharmacies match the selected filter.
                  </td>
                </tr>
              ) : (
                visiblePreferences.map((preference) => {
                  const pharmacy = preference.pharmacy || {};

                  return (
                    <tr
                      key={preference.id}
                      {...getAdminRowActionProps({
                        label: `Edit pharmacy ${pharmacy.name || preference.id}`,
                        onAction: () => {
                          setEditingPreference(preference);
                          setIsModalOpen(true);
                        },
                      })}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cf-accent/12 text-[11px] font-semibold text-cf-accent ring-1 ring-cf-accent/20">
                            {pharmacy.name
                              ?.split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part.charAt(0))
                              .join("")
                              .toUpperCase() || "RX"}
                          </span>
                          <div>
                            <div className="font-semibold text-cf-text">
                              {pharmacy.name}
                            </div>
                            <div className="text-[11px] text-cf-text-muted">
                              {formatDirectorySource(pharmacy)} ·{" "}
                              {pharmacy.service_type || "retail"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        <div>NCPDP: {pharmacy.ncpdp_id || "—"}</div>
                        <div className="mt-1 text-xs text-cf-text-subtle">
                          NPI: {pharmacy.npi || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        <div>{pharmacy.phone_number || "No phone"}</div>
                        <div className="mt-1 text-xs text-cf-text-subtle">
                          {pharmacy.fax_number
                            ? `Fax: ${pharmacy.fax_number}`
                            : "No fax"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        {formatAddress(pharmacy.address)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="muted">
                            {formatDirectoryStatus(pharmacy)}
                          </Badge>
                          {pharmacy.accepts_erx ? (
                            <Badge variant="neutral">eRx</Badge>
                          ) : null}
                          {getStatusBadge(preference)}
                        </div>
                        {preference.notes ? (
                          <div className="mt-2 max-w-xs truncate text-xs text-cf-text-subtle">
                            {preference.notes}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={visiblePreferences.length}
          total={preferences.length}
          label="pharmacies"
        />
      </AdminTableCard>

      <OrganizationPharmacyModal
        isOpen={isModalOpen}
        mode={editingPreference ? "edit" : "create"}
        initialValues={editingPreference}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        onDeactivate={editingPreference ? handleDeactivate : undefined}
      />

      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        variant={confirmDialogState.variant}
        onConfirm={handleConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}
