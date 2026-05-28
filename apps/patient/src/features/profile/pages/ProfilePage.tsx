import { useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "../../auth/AuthProvider";
import type { PortalInsurancePolicy } from "../../auth/api/portalAuth";
import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { SegmentedControl } from "../../../shared/components/ui/SegmentedControl";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { formatDateOnly } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useProfile, useUpdateProfile } from "../api/profile";
import { PreferredPharmacySection } from "../components/PreferredPharmacySection";

type Row = { label: string; value: ReactNode };
type Tab = "personal" | "contact" | "emergency" | "insurance";

const TABS = [
  { value: "personal" as const, label: "Personal" },
  { value: "contact" as const, label: "Contact & Address" },
  { value: "emergency" as const, label: "Emergency" },
  { value: "insurance" as const, label: "Insurance" },
];

function dash(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const trimmed = String(value).trim();
  return trimmed === "" ? "—" : trimmed;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
        {title}
      </h2>
      <dl className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 text-sm"
          >
            <dt className="text-xs text-cf-text-muted">{row.label}</dt>
            <dd className="text-cf-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function InsuranceCard({ policy }: { policy: PortalInsurancePolicy }) {
  return (
    <div className="relative overflow-hidden rounded-cf-shell bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-panel-lg border border-slate-700">
      {/* Decorative accent lines */}
      <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-cf-accent-soft/10 blur-3xl pointer-events-none" />
      <div className="absolute left-0 bottom-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-cf-surface-soft/5 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Health Insurance Policy
          </span>
          <h3 className="text-base font-bold text-slate-100 tracking-tight mt-0.5">
            {policy.carrier_name || "Unknown Carrier"}
          </h3>
        </div>
        {policy.is_primary && (
          <span className="rounded-full bg-cf-accent-soft px-2.5 py-0.5 text-[10px] font-semibold text-cf-accent">
            Primary Coverage
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            Member ID
          </div>
          <div className="font-mono text-slate-200 mt-0.5">
            {policy.member_id || "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            Group Number
          </div>
          <div className="font-mono text-slate-200 mt-0.5">
            {policy.group_number || "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            Subscriber
          </div>
          <div className="font-medium text-slate-200 mt-0.5 truncate">
            {policy.subscriber_name || "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            Relationship
          </div>
          <div className="text-slate-200 mt-0.5 capitalize">
            {policy.relationship_to_subscriber || "—"}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center text-[10px] text-slate-400">
        <div>
          Plan:{" "}
          <span className="text-slate-200 font-medium">
            {policy.plan_name || "Standard Plan"}
          </span>
        </div>
        <div>
          Effective:{" "}
          <span className="text-slate-200 font-medium">
            {formatDateOnly(policy.effective_date)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { patient: bootstrapPatient } = useAuth();
  const { data, isError, error } = useProfile();
  const patient = data ?? bootstrapPatient;
  const updateProfile = useUpdateProfile();

  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    preferred_name: "",
    pronouns: "",
    preferred_language: "",
    email: "",
    primary_phone_number: "",
    address: {
      line_1: "",
      line_2: "",
      city: "",
      state: "",
      zip_code: "",
    },
    primary_emergency_contact: {
      name: "",
      relationship: "",
      phone_number: "",
    },
  });
  const [editError, setEditError] = useState<string | null>(null);

  if (!patient) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Profile" />
        {isError ? (
          <p className="text-sm text-cf-text-muted">{getErrorMessage(error)}</p>
        ) : null}
      </div>
    );
  }

  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const address = patient.address;
  const addressLines = [
    dash(address?.line_1),
    address?.line_2 ? dash(address.line_2) : null,
    [dash(address?.city), dash(address?.state), dash(address?.zip_code)].join(
      ", "
    ),
  ].filter((line): line is string => Boolean(line));

  const emergency = patient.primary_emergency_contact;

  const startEditing = () => {
    setForm({
      preferred_name: patient.preferred_name || "",
      pronouns: patient.pronouns || "",
      preferred_language: patient.preferred_language || "",
      email: patient.email || "",
      primary_phone_number: patient.primary_phone_number || "",
      address: {
        line_1: patient.address?.line_1 || "",
        line_2: patient.address?.line_2 || "",
        city: patient.address?.city || "",
        state: patient.address?.state || "",
        zip_code: patient.address?.zip_code || "",
      },
      primary_emergency_contact: {
        name: patient.primary_emergency_contact?.name || "",
        relationship: patient.primary_emergency_contact?.relationship || "",
        phone_number: patient.primary_emergency_contact?.phone_number || "",
      },
    });
    setEditError(null);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    try {
      await updateProfile.mutateAsync(form);
      setIsEditing(false);
    } catch (err) {
      setEditError(getErrorMessage(err));
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIsEditing(false);
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <PageHeader
          title={
            isEditing
              ? `Edit ${TABS.find((t) => t.value === activeTab)?.label}`
              : "Profile"
          }
        />
        {activeTab !== "insurance" && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center rounded-cf-control border border-cf-border bg-cf-surface px-3 py-1.5 text-xs font-semibold text-cf-text transition-colors hover:bg-cf-surface-soft"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="inline-flex items-center rounded-cf-control bg-cf-accent px-3 py-1.5 text-xs font-semibold text-cf-surface transition-colors hover:bg-cf-accent-hover disabled:opacity-60"
                >
                  {updateProfile.isPending ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-1.5 rounded-cf-control border border-cf-border bg-cf-surface px-3 py-1.5 text-xs font-semibold text-cf-text transition-colors hover:bg-cf-surface-soft"
              >
                Edit section
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      {!isEditing && (
        <div className="border-b border-cf-border pb-1">
          <SegmentedControl<Tab>
            options={TABS}
            value={activeTab}
            onChange={handleTabChange}
            ariaLabel="Profile details sections"
          />
        </div>
      )}

      {/* Localized validation errors */}
      {isEditing && editError && (
        <div
          role="alert"
          className="rounded-cf-control border border-cf-danger-text/30 bg-cf-danger-bg px-3 py-2 text-sm text-cf-danger-text"
        >
          {editError}
        </div>
      )}

      {/* Main body content */}
      <div className="bg-cf-surface border border-cf-border rounded-cf-shell p-6 shadow-panel">
        {isEditing ? (
          <form onSubmit={handleSave}>
            {activeTab === "personal" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-xs text-cf-text-muted">
                    Legal Name
                  </span>
                  <span className="text-sm font-medium py-2 px-1 text-cf-text block">
                    {fullName}
                  </span>
                </div>
                <div>
                  <label
                    htmlFor="preferred_name"
                    className="mb-1 block text-xs text-cf-text-muted"
                  >
                    Preferred Name
                  </label>
                  <input
                    id="preferred_name"
                    type="text"
                    value={form.preferred_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        preferred_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-cf-text-muted">
                    Date of Birth
                  </span>
                  <span className="text-sm font-medium py-2 px-1 text-cf-text block">
                    {formatDateOnly(patient.date_of_birth)}
                  </span>
                </div>
                <div>
                  <span className="mb-1 block text-xs text-cf-text-muted">
                    Sex at Birth
                  </span>
                  <span className="text-sm font-medium py-2 px-1 text-cf-text block">
                    {dash(patient.sex_at_birth)}
                  </span>
                </div>
                <div>
                  <label
                    htmlFor="pronouns"
                    className="mb-1 block text-xs text-cf-text-muted"
                  >
                    Pronouns
                  </label>
                  <input
                    id="pronouns"
                    type="text"
                    value={form.pronouns}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, pronouns: e.target.value }))
                    }
                    className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="preferred_language"
                    className="mb-1 block text-xs text-cf-text-muted"
                  >
                    Preferred Language
                  </label>
                  <input
                    id="preferred_language"
                    type="text"
                    value={form.preferred_language}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        preferred_language: e.target.value,
                      }))
                    }
                    className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-cf-text-muted">
                    Race
                  </span>
                  <span className="text-sm font-medium py-2 px-1 text-cf-text block">
                    {dash(patient.race)}
                  </span>
                </div>
                <div>
                  <span className="mb-1 block text-xs text-cf-text-muted">
                    Ethnicity
                  </span>
                  <span className="text-sm font-medium py-2 px-1 text-cf-text block">
                    {dash(patient.ethnicity)}
                  </span>
                </div>
              </div>
            )}

            {activeTab === "contact" && (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
                  Contact Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1 block text-xs text-cf-text-muted"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="primary_phone_number"
                      className="mb-1 block text-xs text-cf-text-muted"
                    >
                      Phone Number
                    </label>
                    <input
                      id="primary_phone_number"
                      type="text"
                      value={form.primary_phone_number}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          primary_phone_number: e.target.value,
                        }))
                      }
                      className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                    />
                  </div>
                </div>

                <h3 className="text-xs font-semibold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1 pt-2">
                  Primary Address
                </h3>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="line_1"
                        className="mb-1 block text-xs text-cf-text-muted"
                      >
                        Address Line 1
                      </label>
                      <input
                        id="line_1"
                        type="text"
                        value={form.address.line_1}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              line_1: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="line_2"
                        className="mb-1 block text-xs text-cf-text-muted"
                      >
                        Address Line 2 (Optional)
                      </label>
                      <input
                        id="line_2"
                        type="text"
                        value={form.address.line_2}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              line_2: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="city"
                        className="mb-1 block text-xs text-cf-text-muted"
                      >
                        City
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={form.address.city}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            address: { ...prev.address, city: e.target.value },
                          }))
                        }
                        className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="state"
                        className="mb-1 block text-xs text-cf-text-muted"
                      >
                        State
                      </label>
                      <select
                        id="state"
                        value={form.address.state}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            address: { ...prev.address, state: e.target.value },
                          }))
                        }
                        className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                      >
                        <option value="">Select State</option>
                        <option value="NY">New York</option>
                        <option value="CA">California</option>
                        <option value="TX">Texas</option>
                        <option value="FL">Florida</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="zip_code"
                        className="mb-1 block text-xs text-cf-text-muted"
                      >
                        ZIP Code
                      </label>
                      <input
                        id="zip_code"
                        type="text"
                        value={form.address.zip_code}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              zip_code: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "emergency" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="emergency_name"
                    className="mb-1 block text-xs text-cf-text-muted"
                  >
                    Contact Name
                  </label>
                  <input
                    id="emergency_name"
                    type="text"
                    value={form.primary_emergency_contact.name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primary_emergency_contact: {
                          ...prev.primary_emergency_contact,
                          name: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="emergency_relationship"
                    className="mb-1 block text-xs text-cf-text-muted"
                  >
                    Relationship
                  </label>
                  <input
                    id="emergency_relationship"
                    type="text"
                    value={form.primary_emergency_contact.relationship}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primary_emergency_contact: {
                          ...prev.primary_emergency_contact,
                          relationship: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="emergency_phone_number"
                    className="mb-1 block text-xs text-cf-text-muted"
                  >
                    Phone Number
                  </label>
                  <input
                    id="emergency_phone_number"
                    type="text"
                    value={form.primary_emergency_contact.phone_number}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primary_emergency_contact: {
                          ...prev.primary_emergency_contact,
                          phone_number: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                  />
                </div>
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-4">
            {activeTab === "personal" && (
              <Section
                title="Identity Details"
                rows={[
                  { label: "Legal Name", value: dash(fullName) },
                  {
                    label: "Preferred Name",
                    value: dash(patient.preferred_name),
                  },
                  {
                    label: "Date of birth",
                    value: formatDateOnly(patient.date_of_birth),
                  },
                  { label: "Sex at birth", value: dash(patient.sex_at_birth) },
                  { label: "Pronouns", value: dash(patient.pronouns) },
                  { label: "Race", value: dash(patient.race) },
                  { label: "Ethnicity", value: dash(patient.ethnicity) },
                  {
                    label: "Language",
                    value: dash(patient.preferred_language),
                  },
                ]}
              />
            )}

            {activeTab === "contact" && (
              <div className="space-y-5">
                <Section
                  title="Contact Information"
                  rows={[
                    { label: "Email address", value: dash(patient.email) },
                    {
                      label: "Phone number",
                      value: dash(patient.primary_phone_number),
                    },
                  ]}
                />
                <div className="border-t border-cf-border pt-4">
                  <Section
                    title="Address Details"
                    rows={[
                      {
                        label: "Primary address",
                        value: (
                          <div className="space-y-0.5">
                            {addressLines.map((line, idx) => (
                              <div key={idx}>{line}</div>
                            ))}
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
                <PreferredPharmacySection
                  preferredPharmacyName={patient.preferred_pharmacy_name ?? ""}
                />
              </div>
            )}

            {activeTab === "emergency" && (
              <Section
                title="Emergency Contact Details"
                rows={[
                  { label: "Contact Name", value: dash(emergency?.name) },
                  {
                    label: "Relationship",
                    value: dash(emergency?.relationship),
                  },
                  {
                    label: "Phone number",
                    value: dash(emergency?.phone_number),
                  },
                ]}
              />
            )}

            {activeTab === "insurance" && (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle mb-1">
                  Active Coverages
                </h2>
                {!patient.insurance_policies ||
                patient.insurance_policies.length === 0 ? (
                  <EmptyState message="No active insurance policies on file. Please contact your clinician or administration desk to supply coverage." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {patient.insurance_policies.map(
                      (policy: PortalInsurancePolicy) => (
                        <InsuranceCard key={policy.id} policy={policy} />
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
