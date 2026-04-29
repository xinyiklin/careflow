import { useEffect, useState } from "react";

import { AdminFormModal } from "../shared/AdminFormModal";
import { CompactModalGrid } from "../shared/AdminCompactModal";
import {
  PharmacyDetailsLane,
  PharmacyDirectoryLane,
} from "./OrganizationPharmacyModalSections";

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
      maxWidth="3xl"
      formId="organization-pharmacy-form"
      saving={saving}
      deleteLabel={onDeactivate ? "Deactivate" : ""}
      onDelete={onDeactivate}
    >
      <form id="organization-pharmacy-form" onSubmit={handleSubmit}>
        <CompactModalGrid>
          <PharmacyDirectoryLane
            formData={formData}
            directoryMeta={directoryMeta}
            onChange={handleChange}
          />
          <PharmacyDetailsLane
            formData={formData}
            onChange={handleChange}
            onAddressChange={handleAddressChange}
          />
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
