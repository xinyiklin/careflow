import { Input } from "../../../../shared/components/ui";
import PhoneInput from "../../../../shared/components/PhoneInput";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";
import {
  Users,
  Shield,
  MapPin,
  Phone,
  FileText,
  Building2,
  Mail,
  Globe,
  CreditCard,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import type {
  AdminAddressForm,
  AdminOrganizationOverviewForm,
} from "../../types";

type AdminFormChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

type FieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function hasText(value: unknown) {
  return Boolean(String(value || "").trim());
}

function Field({ label, children, className = "" }: FieldProps) {
  return (
    <label className={["block", className].filter(Boolean).join(" ")}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function OrganizationOverviewHeader({
  formData,
}: {
  formData: AdminOrganizationOverviewForm;
}) {
  const initialLetter = formData.name?.charAt(0).toUpperCase() || "O";
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-cf-border/60 pb-5 mb-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cf-accent/10 border border-cf-accent/20 text-lg font-bold text-cf-accent">
          {initialLetter}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-cf-text">
              {formData.name || "Organization"}
            </h2>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-cf-text-muted font-medium">
            <span className="font-semibold text-cf-text-subtle uppercase tracking-wider text-[10px]">
              {formData.slug || "No Slug"}
            </span>
            <span className="h-3 w-px bg-cf-border" />
            <span>{formData.legal_name || "No Legal Name"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrganizationIdentityCard({
  formData,
  onChange,
}: {
  formData: AdminOrganizationOverviewForm;
  onChange: (event: AdminFormChangeEvent) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-cf-accent" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
          Identity & Licensing
        </h3>
      </div>

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
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

export function OrganizationContactCard({
  formData,
  onChange,
}: {
  formData: AdminOrganizationOverviewForm;
  onChange: (event: AdminFormChangeEvent) => void;
}) {
  const fireChange = (name: string, value: string) =>
    onChange({ target: { name, value, type: "text" } } as AdminFormChangeEvent);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-cf-accent" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
          Contact Channels
        </h3>
      </div>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field label="Phone">
          <PhoneInput
            name="phone_number"
            value={formData.phone_number}
            onChange={(value) => fireChange("phone_number", value)}
            placeholder="(555) 000-0000"
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

export function OrganizationNotesCard({
  formData,
  onChange,
}: {
  formData: AdminOrganizationOverviewForm;
  onChange: (event: AdminFormChangeEvent) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-cf-accent" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
          Internal Notes
        </h3>
      </div>
      <Input
        as="textarea"
        name="notes"
        value={formData.notes}
        onChange={onChange}
        rows={7}
      />
    </section>
  );
}

export function OrganizationAddressCard({
  address,
  onChange,
}: {
  address: AdminAddressForm;
  onChange: (event: AdminFormChangeEvent) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-cf-accent" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
          Physical Address
        </h3>
      </div>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field label="Address line 1" className="sm:col-span-2">
          <Input
            name="line_1"
            value={address?.line_1 || ""}
            onChange={onChange}
          />
        </Field>
        <Field label="Address line 2" className="sm:col-span-2">
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

export function OrganizationReadOnlyOverview({
  formData,
  activePeopleCount,
  adminCount,
  facilitiesCount,
  payersCount,
  loadingFacilities,
  loadingPayers,
}: {
  formData: AdminOrganizationOverviewForm;
  activePeopleCount: number;
  adminCount: number;
  facilitiesCount: number;
  payersCount: number;
  loadingFacilities?: boolean;
  loadingPayers?: boolean;
}) {
  const address = formData.address;
  const addressStr = address?.line_1
    ? [
        address.line_1,
        address.line_2,
        `${address.city || ""}, ${address.state || ""} ${address.zip_code || ""}`.trim(),
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_2.2fr]">
      {/* Left Column: Organization Contact & Profile (1/3) */}
      <div className="space-y-6 md:border-r md:border-cf-border/60 md:pr-6">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
            <Building2 className="h-4 w-4 text-cf-accent" />
            Organization Profile
          </h3>

          <div className="space-y-4 text-xs font-semibold">
            <div className="flex items-start gap-3 py-1 border-b border-cf-border/40 pb-2">
              <Shield className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                  Tax ID
                </span>
                <span className="text-cf-text block truncate text-sm font-bold">
                  {formData.tax_id || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 py-1 border-b border-cf-border/40 pb-2">
              <Phone className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                  Phone
                </span>
                <span className="text-cf-text block truncate text-sm font-bold">
                  {formData.phone_number || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 py-1 border-b border-cf-border/40 pb-2">
              <Mail className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                  Email
                </span>
                <span className="text-cf-text block truncate text-sm font-bold break-all">
                  {formData.email || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 py-1 border-b border-cf-border/40 pb-2">
              <Globe className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                  Website
                </span>
                <span className="text-cf-text block truncate text-sm font-bold">
                  {formData.website ? (
                    <a
                      href={
                        formData.website.startsWith("http")
                          ? formData.website
                          : `https://${formData.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cf-accent hover:underline"
                    >
                      {formData.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 py-1">
              <MapPin className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                  Headquarters Address
                </span>
                {addressStr ? (
                  <div className="text-cf-text text-sm font-bold leading-relaxed">
                    {addressStr.split("\n").map((line, i) => (
                      <div
                        key={i}
                        className={
                          i === addressStr.split("\n").length - 1
                            ? "text-cf-text-muted mt-0.5"
                            : ""
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-cf-text-muted block mt-1">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Dashboard Details & Stats (2/3) */}
      <div className="space-y-6">
        {/* Footprint Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Total Users",
              value: activePeopleCount,
              icon: Users,
              color: "text-indigo-500 bg-indigo-500/8 dark:bg-indigo-500/12",
            },
            {
              label: "Admins",
              value: adminCount,
              icon: Shield,
              color: "text-blue-500 bg-blue-500/8 dark:bg-blue-500/12",
            },
            {
              label: "Facilities",
              value: loadingFacilities ? "..." : facilitiesCount,
              icon: Building2,
              color: "text-teal-500 bg-teal-500/8 dark:bg-teal-500/12",
            },
            {
              label: "Payers",
              value: loadingPayers ? "..." : payersCount,
              icon: CreditCard,
              color: "text-amber-500 bg-amber-500/8 dark:bg-amber-500/12",
            },
          ].map((stat, idx) => (
            <div key={idx} className="cf-admin-stat flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-cf-text leading-none">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-cf-text-subtle leading-none">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <hr className="border-cf-border/60" />

        {/* Notes & Information */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
            <FileText className="h-4 w-4 text-cf-accent" />
            Internal Notes & Guidelines
          </h3>
          <div className="rounded-xl border border-cf-border/50 bg-cf-surface-soft/15 p-4 text-xs leading-relaxed text-cf-text-muted whitespace-pre-wrap font-medium min-h-[180px] max-h-[300px] overflow-y-auto shadow-inner">
            {formData.notes ||
              "No notes or announcements configured for this organization."}
          </div>
        </div>
      </div>
    </div>
  );
}
