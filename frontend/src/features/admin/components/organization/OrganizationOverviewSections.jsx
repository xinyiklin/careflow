import { Input } from "../../../../shared/components/ui";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";

export function hasText(value) {
  return Boolean(String(value || "").trim());
}

function getInitials(name) {
  return (
    name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "OR"
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={className}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-cf-text-subtle">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-xl bg-cf-surface-soft p-3 text-center">
      <div className="text-xl font-semibold tracking-tight text-cf-text">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-cf-text-subtle">
        {label}
      </div>
    </div>
  );
}

export function OrganizationOverviewHeader({ formData }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
          Organization · Overview
        </div>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-cf-text">
          {formData.name || "Organization"}
        </h3>
        <p className="mt-1 text-sm text-cf-text-muted">
          Identity, contact, and administrative profile for this organization.
        </p>
      </div>
      <span className="rounded-full border border-cf-border bg-cf-surface-soft px-3 py-1 text-xs font-semibold text-cf-text-muted">
        {formData.slug || "No slug"}
      </span>
    </header>
  );
}

export function OrganizationIdentityCard({ formData, onChange }) {
  return (
    <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)] lg:col-span-2">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cf-accent/12 text-sm font-semibold text-cf-accent ring-1 ring-cf-accent/20">
          {getInitials(formData.name)}
        </span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Identity
          </div>
          <div className="text-sm font-semibold text-cf-text">
            {formData.legal_name || formData.name || "Legal entity"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Field label="Organization name">
          <Input name="name" value={formData.name} onChange={onChange} />
        </Field>
        <Field label="Slug">
          <Input name="slug" value={formData.slug} onChange={onChange} />
        </Field>
        <Field label="Legal name">
          <Input
            name="legal_name"
            value={formData.legal_name}
            onChange={onChange}
          />
        </Field>
        <Field label="Tax ID">
          <Input name="tax_id" value={formData.tax_id} onChange={onChange} />
        </Field>
      </div>
    </div>
  );
}

export function OrganizationFootprintCard({
  activePeopleCount,
  adminCount,
  configuredFieldCount,
  hasAddress,
}) {
  return (
    <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        Footprint
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <SummaryTile label="Users" value={activePeopleCount || 0} />
        <SummaryTile label="Admins" value={adminCount} />
        <SummaryTile label="Profile" value={`${configuredFieldCount}/8`} />
        <SummaryTile label="Address" value={hasAddress ? "Set" : "—"} />
      </div>
    </div>
  );
}

export function OrganizationContactCard({ formData, onChange }) {
  return (
    <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)] lg:col-span-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        Contact
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-3">
        <Field label="Phone">
          <Input
            name="phone_number"
            value={formData.phone_number}
            onChange={onChange}
          />
        </Field>
        <Field label="Email">
          <Input
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
          />
        </Field>
        <Field label="Website">
          <Input name="website" value={formData.website} onChange={onChange} />
        </Field>
      </div>
    </div>
  );
}

export function OrganizationNotesCard({ formData, onChange }) {
  return (
    <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        Notes
      </div>
      <Input
        as="textarea"
        name="notes"
        value={formData.notes}
        onChange={onChange}
        rows={5}
        className="mt-3"
      />
    </div>
  );
}

export function OrganizationAddressCard({ address, onChange }) {
  return (
    <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)] lg:col-span-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        Address
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Address line 1" className="md:col-span-2">
          <Input
            name="line_1"
            value={address?.line_1 || ""}
            onChange={onChange}
          />
        </Field>
        <Field label="Address line 2" className="md:col-span-2">
          <Input
            name="line_2"
            value={address?.line_2 || ""}
            onChange={onChange}
          />
        </Field>
        <Field label="City">
          <Input name="city" value={address?.city || ""} onChange={onChange} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State">
            <Input
              as="select"
              name="state"
              value={address?.state || "NY"}
              onChange={onChange}
            >
              {US_STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Input>
          </Field>
          <Field label="ZIP code">
            <Input
              name="zip_code"
              value={address?.zip_code || ""}
              onChange={onChange}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
