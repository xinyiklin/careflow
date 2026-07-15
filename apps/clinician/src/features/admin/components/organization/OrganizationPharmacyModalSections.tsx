import type { ChangeEvent } from "react";
import { Building, Zap, MapPin, Settings } from "lucide-react";

import { Input } from "../../../../shared/components/ui";
import PhoneInput from "../../../../shared/components/PhoneInput";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";

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

type PharmacyFormContentProps = {
  formData: OrganizationPharmacyForm;
  onChange: (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  onAddressChange: (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  saving?: boolean;
  canonicalReadOnly?: boolean;
};

export function PharmacyFormContent({
  formData,
  onChange,
  onAddressChange,
  saving = false,
  canonicalReadOnly = false,
}: PharmacyFormContentProps) {
  const fireChange = (name: string, value: string) => {
    onChange({
      target: { name, value, type: "text" },
    } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Left Column: Identity & E-Prescribing */}
      <fieldset
        className="space-y-6 disabled:opacity-70"
        disabled={saving || canonicalReadOnly}
      >
        {/* Section 1: Pharmacy Identity */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Building className="h-4 w-4 text-cf-accent shrink-0" />
            Identity & Contact
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Display Name <span className="text-cf-accent">*</span>
              </span>
              <Input
                name="name"
                value={formData.name}
                onChange={onChange}
                required
                disabled={saving}
                placeholder="e.g. CareFlow Central Pharmacy"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Legal Business Name
              </span>
              <Input
                name="legal_business_name"
                value={formData.legal_business_name}
                onChange={onChange}
                disabled={saving}
                placeholder="e.g. CareFlow Pharmacy Solutions Inc."
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Phone Number <span className="text-cf-accent">*</span>
              </span>
              <PhoneInput
                name="phone_number"
                value={formData.phone_number}
                onChange={(val) => fireChange("phone_number", val)}
                required
                disabled={saving}
                placeholder="(555) 000-0000"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Fax Number
              </span>
              <PhoneInput
                name="fax_number"
                value={formData.fax_number}
                onChange={(val) => fireChange("fax_number", val)}
                disabled={saving}
                placeholder="(555) 000-0000"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Service Type <span className="text-cf-accent">*</span>
              </span>
              <Input
                as="select"
                name="service_type"
                value={formData.service_type}
                onChange={onChange}
                required
                disabled={saving}
              >
                {SERVICE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
            </label>
          </div>
        </div>

        {/* Section 2: E-Prescribing & Credentials */}
        <div className="space-y-4 pt-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Zap className="h-4 w-4 text-cf-accent shrink-0" />
            E-Prescribing & Credentials
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                NCPDP ID
              </span>
              <Input
                name="ncpdp_id"
                value={formData.ncpdp_id}
                onChange={onChange}
                maxLength={7}
                inputMode="numeric"
                pattern="\d{7}"
                disabled={saving}
                placeholder="7-digit ID"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                NPI
              </span>
              <Input
                name="npi"
                value={formData.npi}
                onChange={onChange}
                maxLength={10}
                inputMode="numeric"
                pattern="\d{10}"
                disabled={saving}
                placeholder="10-digit NPI"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                DEA Number
              </span>
              <Input
                name="dea_number"
                value={formData.dea_number}
                onChange={onChange}
                maxLength={9}
                pattern="^[A-Za-z]{2}\d{7}$"
                disabled={saving}
                placeholder="2 letters + 7 digits"
                className="uppercase"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Store Number
              </span>
              <Input
                name="store_number"
                value={formData.store_number}
                onChange={onChange}
                disabled={saving}
                placeholder="e.g. #1204"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Tax ID (EIN)
              </span>
              <Input
                name="tax_id"
                value={formData.tax_id}
                onChange={onChange}
                disabled={saving}
                placeholder="e.g. 12-3456789"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <label className="flex items-center justify-between cursor-pointer rounded-xl border border-cf-border/60 bg-cf-surface-soft/10 p-3 hover:bg-cf-surface-soft/20 transition">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-cf-text">
                  Accepts eRx
                </span>
                <span className="text-[10px] text-cf-text-muted">
                  Enabled for electronic routing
                </span>
              </div>
              <input
                type="checkbox"
                name="accepts_erx"
                checked={formData.accepts_erx}
                onChange={onChange}
                disabled={saving}
                className="h-4 w-4 accent-[var(--color-cf-accent)] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer rounded-xl border border-cf-border/60 bg-cf-surface-soft/10 p-3 hover:bg-cf-surface-soft/20 transition">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-cf-text">
                  24-Hour
                </span>
                <span className="text-[10px] text-cf-text-muted">
                  Open 24 hours daily
                </span>
              </div>
              <input
                type="checkbox"
                name="is_24_hour"
                checked={formData.is_24_hour}
                onChange={onChange}
                disabled={saving}
                className="h-4 w-4 accent-[var(--color-cf-accent)] cursor-pointer"
              />
            </label>
          </div>
        </div>
      </fieldset>

      {/* Right Column: Address & Organization Settings */}
      <div className="space-y-6 md:border-l md:border-cf-border/60 md:pl-6">
        {/* Section 3: Location Details */}
        <fieldset
          className="space-y-4 disabled:opacity-70"
          disabled={saving || canonicalReadOnly}
        >
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <MapPin className="h-4 w-4 text-cf-accent shrink-0" />
            Location Address
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Address Line 1 <span className="text-cf-accent">*</span>
              </span>
              <Input
                name="line_1"
                value={formData.address.line_1}
                onChange={onAddressChange}
                required
                disabled={saving}
                placeholder="123 Main Street"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Line 2 / Suite
              </span>
              <Input
                name="line_2"
                value={formData.address.line_2}
                onChange={onAddressChange}
                disabled={saving}
                placeholder="Suite 400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                City <span className="text-cf-accent">*</span>
              </span>
              <Input
                name="city"
                value={formData.address.city}
                onChange={onAddressChange}
                required
                disabled={saving}
                placeholder="New York"
              />
            </label>

            <div className="grid gap-4 grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                  State <span className="text-cf-accent">*</span>
                </span>
                <Input
                  as="select"
                  name="state"
                  value={formData.address.state}
                  onChange={onAddressChange}
                  required
                  disabled={saving}
                >
                  {US_STATE_OPTIONS.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Input>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                  ZIP Code <span className="text-cf-accent">*</span>
                </span>
                <Input
                  name="zip_code"
                  value={formData.address.zip_code}
                  onChange={onAddressChange}
                  required
                  pattern="^\d{5}(-\d{4})?$"
                  disabled={saving}
                  placeholder="10001"
                />
              </label>
            </div>
          </div>
        </fieldset>

        {/* Section 4: Organization Preferences */}
        <div className="space-y-4 pt-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
            <Settings className="h-4 w-4 text-cf-accent shrink-0" />
            Preferences & Settings
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between cursor-pointer rounded-xl border border-cf-border/60 bg-cf-surface-soft/10 p-3 hover:bg-cf-surface-soft/20 transition">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-cf-text">
                  Preferred
                </span>
                <span className="text-[10px] text-cf-text-muted">
                  Promoted in selectors
                </span>
              </div>
              <input
                type="checkbox"
                name="is_preferred"
                checked={formData.is_preferred}
                onChange={onChange}
                disabled={saving}
                className="h-4 w-4 accent-[var(--color-cf-accent)] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer rounded-xl border border-cf-border/60 bg-cf-surface-soft/10 p-3 hover:bg-cf-surface-soft/20 transition">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-cf-text">
                  Hidden
                </span>
                <span className="text-[10px] text-cf-text-muted">
                  Hide from intake choices
                </span>
              </div>
              <input
                type="checkbox"
                name="is_hidden"
                checked={formData.is_hidden}
                onChange={onChange}
                disabled={saving}
                className="h-4 w-4 accent-[var(--color-cf-accent)] cursor-pointer"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Sort Order
              </span>
              <Input
                type="number"
                name="sort_order"
                value={formData.sort_order}
                onChange={onChange}
                disabled={saving}
                placeholder="e.g. 0"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                Notes
              </span>
              <Input
                as="textarea"
                name="notes"
                value={formData.notes}
                onChange={onChange}
                disabled={saving}
                rows={3}
                placeholder="Internal pharmacy notes, hours description..."
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
