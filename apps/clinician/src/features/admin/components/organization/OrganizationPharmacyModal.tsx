import { useEffect, useState } from "react";

import {
  formatPhoneInput,
  getPhoneInputDigits,
} from "../../../../shared/utils/phone";
import { AdminFormModal } from "../shared/AdminFormModal";
import {
  PharmacyFormContent,
  getServiceTypeLabel,
  type OrganizationPharmacyForm,
} from "./OrganizationPharmacyModalSections";

import type { ChangeEvent, FormEvent } from "react";
import type {
  AdminAddress,
  AdminOrganizationPharmacyPreference,
  AdminSavePayload,
} from "../../types";

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

function normalizeAddress(address: AdminAddress | null | undefined) {
  if (!address) return EMPTY_ADDRESS;
  return {
    line_1: address.line_1 || "",
    line_2: address.line_2 || "",
    city: address.city || "",
    state: address.state || "NY",
    zip_code: address.zip_code || "",
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
}: {
  isOpen: boolean;
  mode?: "create" | "edit";
  initialValues?: AdminOrganizationPharmacyPreference | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: AdminSavePayload["values"]) => Promise<void> | void;
  onDeactivate?: () => void;
}) {
  const [formData, setFormData] =
    useState<OrganizationPharmacyForm>(DEFAULT_FORM);

  useEffect(() => {
    if (!isOpen) return;

    if (!initialValues) {
      setFormData(DEFAULT_FORM);
      return;
    }

    const pharmacy = initialValues.pharmacy || null;
    setFormData({
      name: pharmacy?.name || "",
      legal_business_name: pharmacy?.legal_business_name || "",
      ncpdp_id: pharmacy?.ncpdp_id || "",
      npi: pharmacy?.npi || "",
      dea_number: pharmacy?.dea_number || "",
      tax_id: pharmacy?.tax_id || "",
      store_number: pharmacy?.store_number || "",
      service_type: pharmacy?.service_type || "retail",
      phone_number: formatPhoneInput(pharmacy?.phone_number || ""),
      fax_number: formatPhoneInput(pharmacy?.fax_number || ""),
      accepts_erx: Boolean(pharmacy?.accepts_erx),
      is_24_hour: Boolean(pharmacy?.is_24_hour),
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
      address: normalizeAddress(pharmacy?.address),
    });
  }, [initialValues, isOpen]);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = event.target;
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      address: { ...current.address, [name]: value },
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
      phone_number: getPhoneInputDigits(formData.phone_number),
      fax_number: getPhoneInputDigits(formData.fax_number),
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

    const canonicalReadOnly =
      initialValues?.pharmacy?.ownership_scope === "global";
    onSubmit?.({
      ...(canonicalReadOnly ? {} : { pharmacy }),
      is_preferred: formData.is_preferred,
      is_hidden: formData.is_hidden,
      is_active: formData.is_active,
      notes: formData.notes.trim(),
      sort_order: Number(formData.sort_order) || 0,
    });
  };

  const initials =
    (formData.name || "RX")
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "RX";

  const isEditMode = mode === "edit";
  const canonicalReadOnly =
    initialValues?.pharmacy?.ownership_scope === "global";
  const modalTitle = isEditMode ? (
    <div className="flex flex-wrap items-center justify-between gap-4 mr-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-cf-accent/10 border border-cf-accent/30 text-cf-accent flex items-center justify-center text-xs font-bold shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold tracking-tight text-cf-text leading-snug">
            {formData.name || "Unnamed Pharmacy"}
          </h4>
          <p className="truncate text-[11px] text-cf-text-muted mt-0.5 font-normal">
            {getServiceTypeLabel(formData.service_type)} ·{" "}
            {formData.phone_number || "No phone"}
          </p>
        </div>
      </div>

      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
        <input
          type="checkbox"
          name="is_active"
          form="organization-pharmacy-form"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
        />
        Active
      </label>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-4 mr-6">
      <span className="text-sm font-semibold text-cf-text">Add Pharmacy</span>
      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
        <input
          type="checkbox"
          name="is_active"
          form="organization-pharmacy-form"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
        />
        Active
      </label>
    </div>
  );

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization Admin"
      title={modalTitle}
      maxWidth="3xl"
      formId="organization-pharmacy-form"
      saving={saving}
      deleteLabel={onDeactivate ? "Deactivate" : ""}
      onDelete={onDeactivate}
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60 overflow-y-auto max-h-[75vh] flex-1"
    >
      <form id="organization-pharmacy-form" onSubmit={handleSubmit}>
        {canonicalReadOnly ? (
          <div className="mb-4 rounded-lg border border-cf-border bg-cf-surface-soft px-3 py-2 text-xs text-cf-text-muted">
            Directory identity, credentials, contact information, and address
            are maintained globally. Organization preferences remain editable.
          </div>
        ) : null}
        <PharmacyFormContent
          formData={formData}
          onChange={handleChange}
          onAddressChange={handleAddressChange}
          saving={saving}
          canonicalReadOnly={canonicalReadOnly}
        />
      </form>
    </AdminFormModal>
  );
}
