import { FormEvent, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { Button } from "../../../../shared/components/ui";
import PhoneInput, {
  getPhoneInputDigits,
} from "../../../../shared/components/PhoneInput";
import useAdminListControls, {
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useFacilityPharmacyCatalogs from "../../hooks/facility/useFacilityPharmacyCatalogs";
import useOrganizationPharmacies from "../../hooks/organization/useOrganizationPharmacies";
import {
  AdminField,
  AdminFieldGrid,
  AdminFormModal,
  AdminFormSection,
} from "../shared/AdminFormModal";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  AdminTableLoadError,
} from "../shared/AdminSurface";
import {
  EmptyRow,
  FacilityListTable,
  FacilitySourceBadge,
} from "./FacilityListPanelShared";

import type { EntityId } from "../../../../shared/api/types";
import type {
  AdminOrganizationPharmacyPreference,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

type FacilityPharmacyRow = {
  id: string;
  name: string;
  serviceType: string;
  active: boolean;
  source: "inherited" | "facility";
  sourceLabel: string;
  preference?: AdminOrganizationPharmacyPreference;
  overrideId?: EntityId | null;
};

const EMPTY_FORM = {
  mode: "directory" as "directory" | "custom",
  directory_id: "",
  name: "",
  service_type: "retail",
  phone_number: "",
  fax_number: "",
};

const PHARMACY_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  { key: "active", label: "Active", predicate: (row) => row.active },
  { key: "inactive", label: "Inactive", predicate: (row) => !row.active },
] satisfies AdminListFilter<FacilityPharmacyRow>[];

const PHARMACY_SORT_OPTIONS = [
  {
    key: "name",
    label: "Name",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "service",
    label: "Service type",
    compare: (a, b) =>
      compareText(a.serviceType, b.serviceType) || compareText(a.name, b.name),
  },
  {
    key: "source",
    label: "Source",
    compare: (a, b) =>
      compareText(a.sourceLabel, b.sourceLabel) || compareText(a.name, b.name),
  },
] satisfies AdminSortOption<FacilityPharmacyRow>[];

export default function FacilityPharmaciesPanel() {
  const { adminFacility } = useAdminFacility();
  const facilityId = adminFacility?.id || null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const {
    pharmacyOverrides,
    directoryPharmacies,
    loading,
    saving,
    error,
    reload,
    savePharmacyOverride,
  } = useFacilityPharmacyCatalogs(facilityId);
  const organizationPharmacies = useOrganizationPharmacies();

  const rows = useMemo<FacilityPharmacyRow[]>(() => {
    const overrideByPreference = new Map(
      pharmacyOverrides
        .filter((override) => override.organization_preference)
        .map((override) => [String(override.organization_preference), override])
    );
    const inheritedRows = organizationPharmacies.preferences.map(
      (preference) => {
        const override = overrideByPreference.get(String(preference.id));
        const active = override ? override.is_active !== false : true;
        return {
          id: `pharmacy-org-${preference.id}`,
          name: preference.pharmacy?.name || "Pharmacy",
          serviceType: preference.pharmacy?.service_type || "Retail",
          active,
          source: "inherited" as const,
          sourceLabel: override ? "Facility override" : "Inherited",
          preference,
          overrideId: override?.id || null,
        };
      }
    );
    const facilityRows = pharmacyOverrides
      .filter((override) => !override.organization_preference)
      .map((override) => {
        const pharmacy = override.effective_pharmacy || override.pharmacy;
        return {
          id: `pharmacy-local-${override.id}`,
          name: pharmacy?.name || "Facility pharmacy",
          serviceType: pharmacy?.service_type || "Retail",
          active: override.is_active !== false,
          source: "facility" as const,
          sourceLabel: "Facility",
          overrideId: override.id,
        };
      });

    return [...inheritedRows, ...facilityRows];
  }, [organizationPharmacies.preferences, pharmacyOverrides]);

  const controls = useAdminListControls(rows, {
    filters: PHARMACY_FILTERS,
    sortOptions: PHARMACY_SORT_OPTIONS,
    storageKey: "facilityPharmacies",
  });

  const handleReload = () => {
    reload();
    void organizationPharmacies.reload();
  };

  const handleToggle = async (row: FacilityPharmacyRow) => {
    if (row.source === "facility") {
      await savePharmacyOverride({
        id: row.overrideId || null,
        values: { is_active: !row.active, is_hidden: row.active },
      });
      return;
    }
    if (!row.preference) return;
    await savePharmacyOverride({
      id: row.overrideId || null,
      values: {
        organization_preference: row.preference.id,
        is_active: !row.active,
        is_hidden: row.active,
      },
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pharmacyValues =
      form.mode === "directory"
        ? { pharmacy_id: Number(form.directory_id) }
        : {
            pharmacy_details: {
              name: form.name,
              service_type: form.service_type,
              phone_number: getPhoneInputDigits(form.phone_number),
              fax_number: getPhoneInputDigits(form.fax_number),
              is_active: true,
            },
          };
    await savePharmacyOverride({
      values: {
        ...pharmacyValues,
        is_active: true,
        is_hidden: false,
        is_preferred: true,
      },
    });
    closeModal();
  };

  return (
    <div className="space-y-4">
      {!facilityId ? (
        <AdminInlineNotice>
          Select a facility to manage pharmacies.
        </AdminInlineNotice>
      ) : null}
      {error && !organizationPharmacies.loadError ? (
        <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>
      ) : null}

      <AdminTableCard>
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={controls.filterOptions}
          activeFilter={controls.activeFilter}
          onFilterChange={controls.setActiveFilter}
          sortOptions={PHARMACY_SORT_OPTIONS}
          activeSort={controls.activeSort}
          onSortChange={controls.setActiveSort}
          actions={
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleReload}
                disabled={loading || saving || !facilityId}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                disabled={saving || !facilityId}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </>
          }
        />
        <FacilityListTable columns={["Pharmacy", "Service", "Status", ""]}>
          {organizationPharmacies.loadError ? (
            <AdminTableLoadError
              colSpan={4}
              message="Couldn't load organization pharmacies."
              onRetry={() => void organizationPharmacies.reload()}
            />
          ) : rows.length === 0 ? (
            <EmptyRow
              colSpan={4}
              label="No organization or facility pharmacies yet."
            />
          ) : controls.visibleRecords.length === 0 ? (
            <EmptyRow
              colSpan={4}
              label="No pharmacies match the selected filter."
            />
          ) : (
            controls.visibleRecords.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-4 font-semibold">{row.name}</td>
                <td className="px-3 py-4 text-cf-text-muted">
                  {row.serviceType || "Retail"}
                </td>
                <td className="px-3 py-4">
                  <FacilitySourceBadge
                    active={row.active}
                    source={row.sourceLabel}
                  />
                </td>
                <td className="px-3 py-4 text-right">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => void handleToggle(row)}
                    disabled={saving}
                  >
                    {row.active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))
          )}
        </FacilityListTable>
        <AdminTableFooter
          shown={controls.visibleRecords.length}
          total={rows.length}
          label="pharmacies"
        />
      </AdminTableCard>

      <AdminFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        scope="Facility pharmacy"
        title="Add Facility Pharmacy"
        formId="facility-pharmacy-form"
        saving={saving}
      >
        <form
          id="facility-pharmacy-form"
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <AdminFormSection>
            <AdminFieldGrid>
              <AdminField label="Source">
                <select
                  className="cf-input"
                  value={form.mode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mode: event.target.value as "directory" | "custom",
                    }))
                  }
                >
                  <option value="directory">Global directory</option>
                  <option value="custom">Facility-only custom pharmacy</option>
                </select>
              </AdminField>
              {form.mode === "directory" ? (
                <AdminField label="Pharmacy">
                  <select
                    className="cf-input"
                    value={form.directory_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        directory_id: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select a directory pharmacy</option>
                    {directoryPharmacies.map((pharmacy) => (
                      <option key={pharmacy.id} value={String(pharmacy.id)}>
                        {pharmacy.name}
                        {pharmacy.city ? `, ${pharmacy.city}` : ""}
                      </option>
                    ))}
                  </select>
                </AdminField>
              ) : null}
              {form.mode === "custom" ? (
                <>
                  <AdminField label="Name">
                    <input
                      className="cf-input"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                    />
                  </AdminField>
                  <AdminField label="Service type">
                    <input
                      className="cf-input"
                      value={form.service_type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          service_type: event.target.value,
                        }))
                      }
                    />
                  </AdminField>
                  <AdminField label="Phone">
                    <PhoneInput
                      name="phone_number"
                      value={form.phone_number}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          phone_number: value,
                        }))
                      }
                    />
                  </AdminField>
                  <AdminField label="Fax">
                    <PhoneInput
                      name="fax_number"
                      value={form.fax_number}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          fax_number: value,
                        }))
                      }
                    />
                  </AdminField>
                </>
              ) : null}
            </AdminFieldGrid>
          </AdminFormSection>
        </form>
      </AdminFormModal>
    </div>
  );
}
