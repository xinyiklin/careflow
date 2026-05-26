import { FormEvent, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import PhoneInput, {
  getPhoneInputDigits,
  formatPhoneInput,
} from "../../../../shared/components/PhoneInput";
import { useQuery } from "@tanstack/react-query";

import { Badge, Button } from "../../../../shared/components/ui";
import {
  AdminField,
  AdminFieldGrid,
  AdminFormModal,
  AdminFormSection,
  AdminToggleField,
} from "../shared/AdminFormModal";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  AdminTableLoadError,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import useOrganizationPayers from "../../hooks/organization/useOrganizationPayers";
import useAdminListControls, {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import { fetchOrganizationFeeSchedules } from "../../api/organization/feeSchedule";

import type {
  AdminOrganizationPayerPreference,
  AdminSortOption,
} from "../../types";
import type { AdminListFilter } from "../../hooks/shared/useAdminListControls";

const EMPTY_FORM = {
  name: "",
  payer_id: "",
  phone_number: "",
  website: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  zip_code: "",
  notes: "",
  is_preferred: true,
  is_hidden: false,
  is_active: true,
  sort_order: "0",
  fee_schedule_id: "",
};

function getInitialForm(preference: AdminOrganizationPayerPreference | null) {
  const carrier = preference?.carrier;
  return {
    ...EMPTY_FORM,
    name: carrier?.name || "",
    payer_id: carrier?.payer_id || "",
    phone_number: formatPhoneInput(carrier?.phone_number || ""),
    website: carrier?.website || "",
    address_line_1: carrier?.address_line_1 || "",
    address_line_2: carrier?.address_line_2 || "",
    city: carrier?.city || "",
    state: carrier?.state || "",
    zip_code: carrier?.zip_code || "",
    notes: preference?.notes || "",
    is_preferred: preference?.is_preferred !== false,
    is_hidden: Boolean(preference?.is_hidden),
    is_active: preference?.is_active !== false,
    sort_order: String(preference?.sort_order ?? "0"),
    fee_schedule_id: String(preference?.fee_schedule || ""),
  };
}

function StatusBadge({
  preference,
}: {
  preference: AdminOrganizationPayerPreference;
}) {
  if (!preference.is_active) return <Badge variant="muted">Inactive</Badge>;
  if (preference.is_hidden) return <Badge variant="warning">Hidden</Badge>;
  if (preference.is_preferred)
    return <Badge variant="success">Preferred</Badge>;
  return <Badge variant="outline">Available</Badge>;
}

const PAYER_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (item) => item.is_active !== false,
  },
  {
    key: "preferred",
    label: "Preferred",
    predicate: (item) => item.is_preferred === true,
  },
  {
    key: "hidden",
    label: "Hidden",
    predicate: (item) => item.is_hidden === true,
  },
  {
    key: "inactive",
    label: "Inactive",
    predicate: (item) => item.is_active === false,
  },
] satisfies AdminListFilter<AdminOrganizationPayerPreference>[];

const PAYER_SORT_OPTIONS = [
  {
    key: "name",
    label: "Name",
    compare: (a, b) => compareText(a.carrier?.name, b.carrier?.name),
  },
  {
    key: "payer-id",
    label: "Payer ID",
    compare: (a, b) =>
      compareText(a.carrier?.payer_id, b.carrier?.payer_id) ||
      compareText(a.carrier?.name, b.carrier?.name),
  },
  {
    key: "preferred",
    label: "Preferred first",
    compare: (a, b) =>
      compareBoolean(a.is_preferred === true, b.is_preferred === true) ||
      compareText(a.carrier?.name, b.carrier?.name),
  },
  {
    key: "fee-schedule",
    label: "Fee schedule",
    compare: (a, b) =>
      compareBoolean(Boolean(a.fee_schedule), Boolean(b.fee_schedule)) ||
      compareText(a.fee_schedule_name, b.fee_schedule_name) ||
      compareText(a.carrier?.name, b.carrier?.name),
  },
] satisfies AdminSortOption<AdminOrganizationPayerPreference>[];

export default function OrganizationPayersPanel() {
  const { payers, loading, saving, error, loadError, reload, savePayer } =
    useOrganizationPayers();
  const schedulesQuery = useQuery({
    queryKey: ["admin", "organization", "fee-schedule-sheets"],
    queryFn: fetchOrganizationFeeSchedules,
  });
  const feeSchedules = Array.isArray(schedulesQuery.data)
    ? schedulesQuery.data
    : [];
  const [editingPayer, setEditingPayer] =
    useState<AdminOrganizationPayerPreference | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const controls = useAdminListControls(payers, {
    filters: PAYER_FILTERS,
    sortOptions: PAYER_SORT_OPTIONS,
    storageKey: "organizationPayers",
  });

  const openModal = (preference: AdminOrganizationPayerPreference | null) => {
    setEditingPayer(preference);
    setForm(getInitialForm(preference));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingPayer(null);
    setIsModalOpen(false);
  };

  const updateField = (name: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await savePayer({
      id: editingPayer?.id || null,
      values: {
        carrier: {
          name: form.name,
          payer_id: form.payer_id,
          phone_number: getPhoneInputDigits(form.phone_number),
          website: form.website,
          address_line_1: form.address_line_1,
          address_line_2: form.address_line_2,
          city: form.city,
          state: form.state,
          zip_code: form.zip_code,
          is_active: true,
        },
        notes: form.notes,
        is_preferred: form.is_preferred,
        is_hidden: form.is_hidden,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
        fee_schedule: form.fee_schedule_id
          ? Number(form.fee_schedule_id)
          : null,
      },
    });
    closeModal();
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
          sortOptions={PAYER_SORT_OPTIONS}
          activeSort={controls.activeSort}
          onSortChange={controls.setActiveSort}
          actions={
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => reload()}
                disabled={loading || saving}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openModal(null)}
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
                {["Payer", "Payer ID", "Contact", "Status"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border text-cf-text">
              {loading ? null : loadError ? (
                <AdminTableLoadError
                  colSpan={4}
                  message="Couldn't load payers."
                  onRetry={() => void reload()}
                />
              ) : payers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No organization payers yet.
                  </td>
                </tr>
              ) : controls.visibleRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No payers match the selected filter.
                  </td>
                </tr>
              ) : (
                controls.visibleRecords.map((preference) => (
                  <tr
                    key={preference.id}
                    {...getAdminRowActionProps({
                      label: `Edit ${preference.carrier?.name || "payer"}`,
                      onAction: () => openModal(preference),
                    })}
                  >
                    <td className="px-5 py-4 font-semibold">
                      {preference.carrier?.name || "Payer"}
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {preference.carrier?.payer_id || "Not set"}
                    </td>
                    <td className="px-5 py-4 text-cf-text-muted">
                      {preference.carrier?.phone_number || "No phone"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge preference={preference} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={controls.visibleRecords.length}
          total={payers.length}
          label="payers"
        />
      </AdminTableCard>

      <AdminFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        scope="Organization payer"
        title={editingPayer ? "Edit Payer" : "Add Payer"}
        formId="organization-payer-form"
        saving={saving}
      >
        <form
          id="organization-payer-form"
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <AdminFormSection>
            <AdminFieldGrid>
              <AdminField label="Name">
                <input
                  className="cf-input"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </AdminField>
              <AdminField label="Payer ID">
                <input
                  className="cf-input"
                  value={form.payer_id}
                  onChange={(event) =>
                    updateField("payer_id", event.target.value)
                  }
                />
              </AdminField>
              <AdminField label="Phone">
                <PhoneInput
                  name="phone_number"
                  value={form.phone_number}
                  onChange={(value) => updateField("phone_number", value)}
                />
              </AdminField>
              <AdminField label="Website">
                <input
                  className="cf-input"
                  value={form.website}
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                />
              </AdminField>
            </AdminFieldGrid>
          </AdminFormSection>
          {feeSchedules.length > 0 ? (
            <AdminFormSection>
              <AdminFieldGrid>
                <AdminField label="Fee schedule">
                  <select
                    className="cf-input"
                    value={form.fee_schedule_id}
                    onChange={(event) =>
                      updateField("fee_schedule_id", event.target.value)
                    }
                  >
                    <option value="">Organization default</option>
                    {feeSchedules.map((schedule) => (
                      <option key={schedule.id} value={String(schedule.id)}>
                        {schedule.name}
                      </option>
                    ))}
                  </select>
                </AdminField>
              </AdminFieldGrid>
            </AdminFormSection>
          ) : null}
          <AdminFormSection>
            <AdminFieldGrid>
              <AdminToggleField
                label="Active"
                name="is_active"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
              />
              <AdminToggleField
                label="Preferred"
                name="is_preferred"
                checked={form.is_preferred}
                onChange={(event) =>
                  updateField("is_preferred", event.target.checked)
                }
              />
              <AdminToggleField
                label="Hidden"
                name="is_hidden"
                checked={form.is_hidden}
                onChange={(event) =>
                  updateField("is_hidden", event.target.checked)
                }
              />
              <AdminField label="Sort order">
                <input
                  type="number"
                  min="0"
                  className="cf-input"
                  value={form.sort_order}
                  onChange={(event) =>
                    updateField("sort_order", event.target.value)
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
