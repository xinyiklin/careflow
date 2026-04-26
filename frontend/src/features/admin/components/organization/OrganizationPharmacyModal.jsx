import { useEffect, useState } from "react";

import { Badge, Input } from "../../../../shared/components/ui";
import {
  AdminField,
  AdminFormModal,
  AdminFormSection,
  AdminToggleField,
} from "../shared/AdminFormModal";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";

const SERVICE_TYPE_OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "mail_order", label: "Mail Order" },
  { value: "specialty", label: "Specialty" },
  { value: "ltc", label: "Long-Term Care" },
  { value: "dme", label: "DME" },
  { value: "home_infusion", label: "Home Infusion" },
  { value: "other", label: "Other" },
];
const EMPTY_ADDRESS = {
  line_1: "",
  line_2: "",
  city: "",
  state: "NY",
  zip_code: "",
};

const DEFAULT_FORM = {
  name: "",
  legal_business_name: "",
  ncpdp_id: "",
  npi: "",
  dea_number: "",
  tax_id: "",
  store_number: "",
  service_type: "retail",
  phone_number: "",
  fax_number: "",
  accepts_erx: false,
  is_24_hour: false,
  notes: "",
  is_preferred: true,
  is_hidden: false,
  is_active: true,
  sort_order: 0,
  address: EMPTY_ADDRESS,
};

function normalizeAddress(address) {
  if (!address) return EMPTY_ADDRESS;
  return {
    line_1: address.line_1 || "",
    line_2: address.line_2 || "",
    city: address.city || "",
    state: address.state || "NY",
    zip_code: address.zip_code || "",
  };
}

function getDirectoryMeta(initialValues) {
  const pharmacy = initialValues?.pharmacy || {};
  const sourceLabel =
    {
      custom: "Custom",
      imported: "Imported",
      directory: "Directory",
    }[pharmacy.source] || "Custom";
  const statusLabel =
    {
      active: "Active",
      inactive: "Inactive",
      unknown: "Not synced",
    }[pharmacy.directory_status] || "Not synced";

  return {
    sourceLabel,
    statusLabel,
    sourceName: pharmacy.directory_source || "Future directory",
  };
}

export default function OrganizationPharmacyModal({
  isOpen,
  mode = "create",
  initialValues = null,
  saving = false,
  onClose,
  onSubmit,
  onDeactivate,
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const directoryMeta = getDirectoryMeta(initialValues);

  useEffect(() => {
    if (!isOpen) return;

    if (!initialValues) {
      setFormData(DEFAULT_FORM);
      return;
    }

    const pharmacy = initialValues.pharmacy || {};
    setFormData({
      name: pharmacy.name || "",
      legal_business_name: pharmacy.legal_business_name || "",
      ncpdp_id: pharmacy.ncpdp_id || "",
      npi: pharmacy.npi || "",
      dea_number: pharmacy.dea_number || "",
      tax_id: pharmacy.tax_id || "",
      store_number: pharmacy.store_number || "",
      service_type: pharmacy.service_type || "retail",
      phone_number: pharmacy.phone_number || "",
      fax_number: pharmacy.fax_number || "",
      accepts_erx: Boolean(pharmacy.accepts_erx),
      is_24_hour: Boolean(pharmacy.is_24_hour),
      notes: initialValues.notes || "",
      is_preferred:
        typeof initialValues.is_preferred === "boolean"
          ? initialValues.is_preferred
          : true,
      is_hidden:
        typeof initialValues.is_hidden === "boolean"
          ? initialValues.is_hidden
          : false,
      is_active:
        typeof initialValues.is_active === "boolean"
          ? initialValues.is_active
          : true,
      sort_order: initialValues.sort_order || 0,
      address: normalizeAddress(pharmacy.address),
    });
  }, [initialValues, isOpen]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      address: { ...current.address, [name]: value },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const pharmacy = {
      name: formData.name.trim(),
      legal_business_name: formData.legal_business_name.trim(),
      source: "custom",
      ncpdp_id: formData.ncpdp_id.trim() || null,
      npi: formData.npi.trim() || null,
      dea_number: formData.dea_number.trim().toUpperCase(),
      tax_id: formData.tax_id.trim(),
      store_number: formData.store_number.trim(),
      service_type: formData.service_type,
      phone_number: formData.phone_number.trim(),
      fax_number: formData.fax_number.trim(),
      accepts_erx: formData.accepts_erx,
      is_24_hour: formData.is_24_hour,
      notes: "",
      is_active: true,
      address: formData.address.line_1.trim()
        ? {
            line_1: formData.address.line_1.trim(),
            line_2: formData.address.line_2.trim(),
            city: formData.address.city.trim(),
            state: formData.address.state,
            zip_code: formData.address.zip_code.trim(),
          }
        : null,
    };

    onSubmit?.({
      pharmacy,
      is_preferred: formData.is_preferred,
      is_hidden: formData.is_hidden,
      is_active: formData.is_active,
      notes: formData.notes.trim(),
      sort_order: Number(formData.sort_order) || 0,
    });
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization admin"
      title={mode === "edit" ? "Edit Pharmacy" : "Add Pharmacy"}
      description="Create or refine an organization pharmacy record for intake, prescriptions, and future directory sync."
      maxWidth="3xl"
      formId="organization-pharmacy-form"
      saving={saving}
      deleteLabel={onDeactivate ? "Deactivate" : ""}
      onDelete={onDeactivate}
    >
      <form
        id="organization-pharmacy-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <AdminFormSection title="Directory Record">
          <div className="mb-4 rounded-2xl border border-cf-border bg-cf-surface-soft/55 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{directoryMeta.sourceLabel} record</Badge>
              <Badge variant="outline">{directoryMeta.statusLabel}</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-cf-text-muted">
              This record is managed locally today and keeps identifiers ready
              for future reconciliation with {directoryMeta.sourceName}.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Display Name" className="md:col-span-2">
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </AdminField>
            <AdminField label="Legal Business Name" className="md:col-span-2">
              <Input
                name="legal_business_name"
                value={formData.legal_business_name}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Phone">
              <Input
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Fax">
              <Input
                name="fax_number"
                value={formData.fax_number}
                onChange={handleChange}
              />
            </AdminField>
          </div>
        </AdminFormSection>

        <AdminFormSection title="E-Prescribing">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="NCPDP ID">
              <Input
                name="ncpdp_id"
                value={formData.ncpdp_id}
                onChange={handleChange}
                maxLength={7}
                inputMode="numeric"
                pattern="\d{7}"
              />
            </AdminField>
            <AdminField label="NPI">
              <Input
                name="npi"
                value={formData.npi}
                onChange={handleChange}
                maxLength={10}
                inputMode="numeric"
                pattern="\d{10}"
              />
            </AdminField>
            <AdminField label="DEA Number">
              <Input
                name="dea_number"
                value={formData.dea_number}
                onChange={handleChange}
                maxLength={9}
                className="uppercase"
              />
            </AdminField>
            <AdminField label="Store Number">
              <Input
                name="store_number"
                value={formData.store_number}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Tax ID">
              <Input
                name="tax_id"
                value={formData.tax_id}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Service Type">
              <Input
                as="select"
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
              >
                {SERVICE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
            </AdminField>
            <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">
              <AdminToggleField
                label="Accepts eRx"
                name="accepts_erx"
                checked={formData.accepts_erx}
                onChange={handleChange}
              />
              <AdminToggleField
                label="24-hour location"
                name="is_24_hour"
                checked={formData.is_24_hour}
                onChange={handleChange}
              />
            </div>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Address">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Address Line 1" className="md:col-span-2">
              <Input
                name="line_1"
                value={formData.address.line_1}
                onChange={handleAddressChange}
              />
            </AdminField>
            <AdminField label="Address Line 2" className="md:col-span-2">
              <Input
                name="line_2"
                value={formData.address.line_2}
                onChange={handleAddressChange}
              />
            </AdminField>
            <AdminField label="City">
              <Input
                name="city"
                value={formData.address.city}
                onChange={handleAddressChange}
              />
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="State">
                <Input
                  as="select"
                  name="state"
                  value={formData.address.state}
                  onChange={handleAddressChange}
                >
                  {US_STATE_OPTIONS.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Input>
              </AdminField>
              <AdminField label="ZIP Code">
                <Input
                  name="zip_code"
                  value={formData.address.zip_code}
                  onChange={handleAddressChange}
                />
              </AdminField>
            </div>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Organization Settings">
          <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
            <AdminField label="Notes">
              <Input
                as="textarea"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </AdminField>
            <AdminField label="Sort Order">
              <Input
                type="number"
                name="sort_order"
                value={formData.sort_order}
                onChange={handleChange}
              />
            </AdminField>
            <div className="grid gap-3 md:col-span-2 sm:grid-cols-3">
              <AdminToggleField
                label="Preferred"
                name="is_preferred"
                checked={formData.is_preferred}
                onChange={handleChange}
              />
              <AdminToggleField
                label="Hidden"
                name="is_hidden"
                checked={formData.is_hidden}
                onChange={handleChange}
              />
              <AdminToggleField
                label="Active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
            </div>
          </div>
        </AdminFormSection>
      </form>
    </AdminFormModal>
  );
}
