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
import useFacilityPayerCatalogs from "../../hooks/facility/useFacilityPayerCatalogs";
import useOrganizationPayers from "../../hooks/organization/useOrganizationPayers";
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
  AdminOrganizationPayerPreference,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

type FacilityPayerRow = {
  id: string;
  name: string;
  payerId: string;
  active: boolean;
  source: "inherited" | "facility";
  sourceLabel: string;
  preference?: AdminOrganizationPayerPreference;
  overrideId?: EntityId | null;
};

const EMPTY_FORM = {
  name: "",
  payer_id: "",
  phone_number: "",
};

const PAYER_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  { key: "active", label: "Active", predicate: (row) => row.active },
  { key: "inactive", label: "Inactive", predicate: (row) => !row.active },
] satisfies AdminListFilter<FacilityPayerRow>[];

const PAYER_SORT_OPTIONS = [
  {
    key: "name",
    label: "Name",
    compare: (a, b) => compareText(a.name, b.name),
  },
  {
    key: "payer-id",
    label: "Payer ID",
    compare: (a, b) =>
      compareText(a.payerId, b.payerId) || compareText(a.name, b.name),
  },
  {
    key: "source",
    label: "Source",
    compare: (a, b) =>
      compareText(a.sourceLabel, b.sourceLabel) || compareText(a.name, b.name),
  },
] satisfies AdminSortOption<FacilityPayerRow>[];

export default function FacilityPayersPanel() {
  const { adminFacility } = useAdminFacility();
  const facilityId = adminFacility?.id || null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { payerOverrides, loading, saving, error, reload, savePayerOverride } =
    useFacilityPayerCatalogs(facilityId);
  const organizationPayers = useOrganizationPayers();

  const rows = useMemo<FacilityPayerRow[]>(() => {
    const overrideByPreference = new Map(
      payerOverrides
        .filter((override) => override.organization_preference)
        .map((override) => [String(override.organization_preference), override])
    );
    const inheritedRows = organizationPayers.payers.map((preference) => {
      const override = overrideByPreference.get(String(preference.id));
      const active = override ? override.is_active !== false : true;
      return {
        id: `payer-org-${preference.id}`,
        name: preference.carrier?.name || "Payer",
        payerId: preference.carrier?.payer_id || "",
        active,
        source: "inherited" as const,
        sourceLabel: override ? "Facility override" : "Inherited",
        preference,
        overrideId: override?.id || null,
      };
    });
    const facilityRows = payerOverrides
      .filter((override) => !override.organization_preference)
      .map((override) => {
        const carrier = override.effective_carrier || override.carrier;
        return {
          id: `payer-local-${override.id}`,
          name: carrier?.name || "Facility payer",
          payerId: carrier?.payer_id || "",
          active: override.is_active !== false,
          source: "facility" as const,
          sourceLabel: "Facility",
          overrideId: override.id,
        };
      });

    return [...inheritedRows, ...facilityRows];
  }, [organizationPayers.payers, payerOverrides]);

  const controls = useAdminListControls(rows, {
    filters: PAYER_FILTERS,
    sortOptions: PAYER_SORT_OPTIONS,
    storageKey: "facilityPayers",
  });

  const handleReload = () => {
    reload();
    void organizationPayers.reload();
  };

  const handleToggle = async (row: FacilityPayerRow) => {
    if (row.source === "facility") {
      await savePayerOverride({
        id: row.overrideId || null,
        values: { is_active: !row.active, is_hidden: row.active },
      });
      return;
    }
    if (!row.preference) return;
    await savePayerOverride({
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
    await savePayerOverride({
      values: {
        carrier_details: {
          name: form.name,
          payer_id: form.payer_id,
          phone_number: getPhoneInputDigits(form.phone_number),
          is_active: true,
        },
        is_active: true,
        is_hidden: false,
      },
    });
    closeModal();
  };

  return (
    <div className="space-y-4">
      {!facilityId ? (
        <AdminInlineNotice>
          Select a facility to manage payers.
        </AdminInlineNotice>
      ) : null}
      {error && !organizationPayers.loadError ? (
        <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>
      ) : null}

      <AdminTableCard>
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={controls.filterOptions}
          activeFilter={controls.activeFilter}
          onFilterChange={controls.setActiveFilter}
          sortOptions={PAYER_SORT_OPTIONS}
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
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </>
          }
        />
        <FacilityListTable columns={["Payer", "Payer ID", "Status", ""]}>
          {organizationPayers.loadError ? (
            <AdminTableLoadError
              colSpan={4}
              message="Couldn't load organization payers."
              onRetry={() => void organizationPayers.reload()}
            />
          ) : rows.length === 0 ? (
            <EmptyRow
              colSpan={4}
              label="No organization or facility payers yet."
            />
          ) : controls.visibleRecords.length === 0 ? (
            <EmptyRow
              colSpan={4}
              label="No payers match the selected filter."
            />
          ) : (
            controls.visibleRecords.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-4 font-semibold">{row.name}</td>
                <td className="px-5 py-4 text-cf-text-muted">
                  {row.payerId || "Not set"}
                </td>
                <td className="px-5 py-4">
                  <FacilitySourceBadge
                    active={row.active}
                    source={row.sourceLabel}
                  />
                </td>
                <td className="px-5 py-4 text-right">
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
          label="payers"
        />
      </AdminTableCard>

      <AdminFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        scope="Facility payer"
        title="Add Facility Payer"
        formId="facility-payer-form"
        saving={saving}
      >
        <form
          id="facility-payer-form"
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <AdminFormSection>
            <AdminFieldGrid>
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
              <AdminField label="Payer ID">
                <input
                  className="cf-input"
                  value={form.payer_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      payer_id: event.target.value,
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
            </AdminFieldGrid>
          </AdminFormSection>
        </form>
      </AdminFormModal>
    </div>
  );
}
