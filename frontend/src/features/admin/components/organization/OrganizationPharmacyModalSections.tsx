import { Input } from "../../../../shared/components/ui";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";
import {
  CompactCard,
  CompactField,
  CompactMetric,
  CompactModalLane,
  CompactPill,
  CompactRecordHeader,
  CompactToggle,
} from "../shared/AdminCompactModal";

import type { ChangeEventHandler } from "react";

export type OrganizationPharmacyForm = {
  name: string;
  legal_business_name: string;
  ncpdp_id: string;
  npi: string;
  dea_number: string;
  tax_id: string;
  store_number: string;
  service_type: string;
  phone_number: string;
  fax_number: string;
  accepts_erx: boolean;
  is_24_hour: boolean;
  notes: string;
  is_preferred: boolean;
  is_hidden: boolean;
  is_active: boolean;
  sort_order: number | string;
  address: {
    line_1: string;
    line_2: string;
    city: string;
    state: string;
    zip_code: string;
  };
};

type DirectoryMeta = {
  sourceLabel: string;
  statusLabel: string;
};

type PharmacyLaneChangeHandler = ChangeEventHandler<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

export const SERVICE_TYPE_OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "mail_order", label: "Mail Order" },
  { value: "specialty", label: "Specialty" },
  { value: "ltc", label: "Long-Term Care" },
  { value: "dme", label: "DME" },
  { value: "home_infusion", label: "Home Infusion" },
  { value: "other", label: "Other" },
];

export function getServiceTypeLabel(value: string) {
  return (
    SERVICE_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    "Retail"
  );
}

export function PharmacyDirectoryLane({
  formData,
  directoryMeta,
  onChange,
}: {
  formData: OrganizationPharmacyForm;
  directoryMeta: DirectoryMeta;
  onChange: PharmacyLaneChangeHandler;
}) {
  return (
    <CompactModalLane>
      <CompactCard>
        <CompactRecordHeader
          initials={(formData.name || "RX").slice(0, 2).toUpperCase()}
          title={formData.name || "Unnamed pharmacy"}
          meta={`${getServiceTypeLabel(formData.service_type)} · ${formData.phone_number || "No phone"}`}
          action={
            <CompactToggle
              label="Active"
              name="is_active"
              checked={formData.is_active}
              onChange={onChange}
            />
          }
        />
      </CompactCard>

      <CompactCard
        eyebrow="Directory"
        action={
          <div className="flex flex-wrap gap-1.5">
            <CompactPill>{directoryMeta.sourceLabel}</CompactPill>
            <CompactPill>{directoryMeta.statusLabel}</CompactPill>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactField label="Display name" className="sm:col-span-2">
            <Input
              name="name"
              value={formData.name}
              onChange={onChange}
              required
            />
          </CompactField>
          <CompactField label="Legal name" className="sm:col-span-2">
            <Input
              name="legal_business_name"
              value={formData.legal_business_name}
              onChange={onChange}
            />
          </CompactField>
          <CompactField label="Phone">
            <Input
              name="phone_number"
              value={formData.phone_number}
              onChange={onChange}
            />
          </CompactField>
          <CompactField label="Fax">
            <Input
              name="fax_number"
              value={formData.fax_number}
              onChange={onChange}
            />
          </CompactField>
        </div>
      </CompactCard>

      <CompactCard eyebrow="E-Prescribing">
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactField label="NCPDP">
            <Input
              name="ncpdp_id"
              value={formData.ncpdp_id}
              onChange={onChange}
              maxLength={7}
              inputMode="numeric"
              pattern="\d{7}"
            />
          </CompactField>
          <CompactField label="NPI">
            <Input
              name="npi"
              value={formData.npi}
              onChange={onChange}
              maxLength={10}
              inputMode="numeric"
              pattern="\d{10}"
            />
          </CompactField>
          <CompactField label="DEA">
            <Input
              name="dea_number"
              value={formData.dea_number}
              onChange={onChange}
              maxLength={9}
              className="uppercase"
            />
          </CompactField>
          <CompactField label="Store">
            <Input
              name="store_number"
              value={formData.store_number}
              onChange={onChange}
            />
          </CompactField>
          <CompactField label="Tax ID">
            <Input name="tax_id" value={formData.tax_id} onChange={onChange} />
          </CompactField>
          <CompactField label="Service">
            <Input
              as="select"
              name="service_type"
              value={formData.service_type}
              onChange={onChange}
            >
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          </CompactField>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <CompactToggle
            label="Accepts eRx"
            name="accepts_erx"
            checked={formData.accepts_erx}
            onChange={onChange}
          />
          <CompactToggle
            label="24-hour"
            name="is_24_hour"
            checked={formData.is_24_hour}
            onChange={onChange}
          />
        </div>
      </CompactCard>
    </CompactModalLane>
  );
}

export function PharmacyDetailsLane({
  formData,
  onChange,
  onAddressChange,
}: {
  formData: OrganizationPharmacyForm;
  onChange: PharmacyLaneChangeHandler;
  onAddressChange: PharmacyLaneChangeHandler;
}) {
  return (
    <CompactModalLane>
      <CompactCard eyebrow="Address">
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactField label="Line 1" className="sm:col-span-2">
            <Input
              name="line_1"
              value={formData.address.line_1}
              onChange={onAddressChange}
            />
          </CompactField>
          <CompactField label="Line 2" className="sm:col-span-2">
            <Input
              name="line_2"
              value={formData.address.line_2}
              onChange={onAddressChange}
            />
          </CompactField>
          <CompactField label="City">
            <Input
              name="city"
              value={formData.address.city}
              onChange={onAddressChange}
            />
          </CompactField>
          <div className="grid gap-3 sm:grid-cols-2">
            <CompactField label="State">
              <Input
                as="select"
                name="state"
                value={formData.address.state}
                onChange={onAddressChange}
              >
                {US_STATE_OPTIONS.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Input>
            </CompactField>
            <CompactField label="ZIP">
              <Input
                name="zip_code"
                value={formData.address.zip_code}
                onChange={onAddressChange}
              />
            </CompactField>
          </div>
        </div>
      </CompactCard>

      <CompactCard eyebrow="Organization">
        <div className="grid grid-cols-3 gap-2">
          <CompactMetric
            label="eRx"
            value={formData.accepts_erx ? "Yes" : "No"}
          />
          <CompactMetric
            label="Hours"
            value={formData.is_24_hour ? "24h" : "Std"}
          />
          <CompactMetric label="Sort" value={formData.sort_order} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <CompactToggle
            label="Preferred"
            name="is_preferred"
            checked={formData.is_preferred}
            onChange={onChange}
          />
          <CompactToggle
            label="Hidden"
            name="is_hidden"
            checked={formData.is_hidden}
            onChange={onChange}
          />
          <CompactField label="Sort">
            <Input
              type="number"
              name="sort_order"
              value={formData.sort_order}
              onChange={onChange}
            />
          </CompactField>
        </div>
        <div className="mt-3">
          <CompactField label="Notes">
            <Input
              as="textarea"
              name="notes"
              value={formData.notes}
              onChange={onChange}
              rows={3}
            />
          </CompactField>
        </div>
      </CompactCard>
    </CompactModalLane>
  );
}
