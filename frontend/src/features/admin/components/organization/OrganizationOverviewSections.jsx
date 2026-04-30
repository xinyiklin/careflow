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
    <div className="border-t border-cf-border py-2.5">
      <div className="text-2xl font-semibold tracking-tight text-cf-text">
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
    <header className="mb-4 border-b border-cf-border pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cf-border bg-cf-surface text-sm font-bold text-cf-text">
          {getInitials(formData.name)}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
            Organization profile
          </div>
          <h3 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-cf-text">
            {formData.name || "Organization"}
          </h3>
          <div className="mt-0.5 text-sm font-medium text-cf-text-muted">
            {formData.legal_name || "Legal entity"}
          </div>
        </div>
      </div>
    </header>
  );
}

export function OrganizationIdentityCard({ formData, onChange }) {
  return (
    <section className="lg:col-span-2">
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
    </section>
  );
}

export function OrganizationFootprintCard({
  activePeopleCount,
  adminCount,
  configuredFieldCount,
  hasAddress,
}) {
  return (
    <section className="lg:border-l lg:border-cf-border lg:pl-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        Footprint
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4">
        <SummaryTile label="Users" value={activePeopleCount || 0} />
        <SummaryTile label="Admins" value={adminCount} />
        <SummaryTile label="Profile" value={`${configuredFieldCount}/8`} />
        <SummaryTile label="Address" value={hasAddress ? "Set" : "—"} />
      </div>
    </section>
  );
}

export function OrganizationContactCard({ formData, onChange }) {
  return (
    <section className="border-t border-cf-border pt-4 lg:col-span-2">
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
    </section>
  );
}

export function OrganizationNotesCard({ formData, onChange }) {
  return (
    <section className="border-t border-cf-border pt-4">
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
    </section>
  );
}

export function OrganizationAddressCard({ address, onChange }) {
  return (
    <section className="border-t border-cf-border pt-4 lg:col-span-3">
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
    </section>
  );
}
