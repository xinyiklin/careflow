import { useEffect, useState } from "react";

import { Badge } from "../../../../shared/components/ui";
import {
  formatPhoneInput,
  getPhoneInputDigits,
} from "../../../../shared/utils/phone";
import { AdminFormModal } from "../shared/AdminFormModal";
import { CompactModalGrid } from "../shared/AdminCompactModal";
import {
  OrganizationAddressCard,
  OrganizationContactCard,
  OrganizationIdentityCard,
  OrganizationNotesCard,
} from "./OrganizationOverviewSections";
import { Globe, Mail, MapPin, Phone, Shield } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import type {
  AdminAddressForm,
  AdminOrganizationOverview,
  AdminOrganizationOverviewForm,
  AdminSavePayload,
} from "../../types";

const EMPTY_ADDR: AdminAddressForm = {
  line_1: "",
  line_2: "",
  city: "",
  state: "NY",
  zip_code: "",
};

const EMPTY_FORM: AdminOrganizationOverviewForm = {
  name: "",
  slug: "",
  legal_name: "",
  phone_number: "",
  email: "",
  website: "",
  tax_id: "",
  notes: "",
  address: { ...EMPTY_ADDR },
};

function formFromOverview(
  org: AdminOrganizationOverview
): AdminOrganizationOverviewForm {
  return {
    name: org.name || "",
    slug: org.slug || "",
    legal_name: org.legal_name || "",
    phone_number: formatPhoneInput(org.phone_number || ""),
    email: org.email || "",
    website: org.website || "",
    tax_id: org.tax_id || "",
    notes: org.notes || "",
    address: {
      line_1: org.address?.line_1 || "",
      line_2: org.address?.line_2 || "",
      city: org.address?.city || "",
      state: org.address?.state || "NY",
      zip_code: org.address?.zip_code || "",
    },
  };
}

function trimValues(f: AdminOrganizationOverviewForm) {
  return {
    ...f,
    name: f.name.trim(),
    slug: f.slug.trim(),
    legal_name: f.legal_name.trim(),
    phone_number: getPhoneInputDigits(f.phone_number),
    email: f.email.trim(),
    website: f.website.trim(),
    tax_id: f.tax_id.trim(),
    notes: f.notes.trim(),
    address: f.address?.line_1
      ? {
          line_1: f.address.line_1.trim(),
          line_2: f.address.line_2.trim(),
          city: f.address.city.trim(),
          state: f.address.state,
          zip_code: f.address.zip_code.trim(),
        }
      : null,
  };
}

type OrganizationOverviewModalProps = {
  isOpen: boolean;
  initialValues: AdminOrganizationOverview | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit?: (values: AdminSavePayload["values"]) => void | Promise<void>;
};

function OrgPreviewPanel({
  formData,
}: {
  formData: AdminOrganizationOverviewForm;
}) {
  const initials =
    formData.name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase() || "O";

  const addressStr = formData.address?.line_1
    ? [formData.address.line_1, formData.address.city]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="flex flex-col items-center bg-cf-surface-soft/20 border border-cf-border/40 rounded-2xl p-6 text-center space-y-5 h-full md:sticky md:top-2">
      {/* Avatar */}
      <div className="h-20 w-20 rounded-full bg-cf-accent/10 border border-cf-accent/30 text-cf-accent flex items-center justify-center text-2xl font-extrabold">
        {initials}
      </div>

      {/* Title & Metadata */}
      <div className="space-y-1 w-full">
        <h4 className="truncate text-base font-bold tracking-tight text-cf-text">
          {formData.name || "Organization"}
        </h4>
        <p className="truncate text-xs font-semibold tracking-wider uppercase text-cf-text-muted">
          {formData.slug || "No Slug"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        <Badge variant="outline" size="sm">
          {formData.legal_name || "No Legal Name"}
        </Badge>
      </div>

      {/* Detail list */}
      <div className="w-full border-t border-cf-border/50 pt-4 text-left space-y-3.5 text-xs font-semibold mt-auto">
        {formData.tax_id && (
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
                Tax ID
              </span>
              <span className="text-cf-text block truncate">
                {formData.tax_id}
              </span>
            </div>
          </div>
        )}

        {formData.phone_number && (
          <div className="flex gap-2">
            <Phone className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
                Phone
              </span>
              <span className="text-cf-text block truncate">
                {formData.phone_number}
              </span>
            </div>
          </div>
        )}

        {formData.email && (
          <div className="flex gap-2">
            <Mail className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
                Email
              </span>
              <span className="text-cf-text block truncate">
                {formData.email}
              </span>
            </div>
          </div>
        )}

        {formData.website && (
          <div className="flex gap-2">
            <Globe className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
                Website
              </span>
              <span className="text-cf-text block truncate">
                {formData.website}
              </span>
            </div>
          </div>
        )}

        {addressStr && (
          <div className="flex gap-2">
            <MapPin className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
                Location
              </span>
              <span className="text-cf-text block truncate leading-tight">
                {addressStr}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrganizationOverviewModal({
  isOpen,
  initialValues,
  saving = false,
  onClose,
  onSubmit,
}: OrganizationOverviewModalProps) {
  const [formData, setFormData] = useState<AdminOrganizationOverviewForm>({
    ...EMPTY_FORM,
    address: { ...EMPTY_ADDR },
  });

  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      initialValues
        ? formFromOverview(initialValues)
        : { ...EMPTY_FORM, address: { ...EMPTY_ADDR } }
    );
  }, [initialValues, isOpen]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: { ...(prev.address || { ...EMPTY_ADDR }), [name]: value },
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(trimValues(formData));
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization"
      title="Edit Organization Details"
      maxWidth="4xl"
      formId="organization-overview-form"
      saving={saving}
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60 !overflow-hidden flex flex-col md:max-h-[70vh] min-h-0 flex-1"
    >
      <form
        id="organization-overview-form"
        onSubmit={handleSubmit}
        className="py-2 flex-1 flex flex-col min-h-0"
      >
        <CompactModalGrid className="flex-1 min-h-0">
          <OrgPreviewPanel formData={formData} />
          <div className="overflow-y-auto pr-2 min-h-0 space-y-6">
            <OrganizationIdentityCard
              formData={formData}
              onChange={handleChange}
            />
            <div className="border-t border-cf-border/50 pt-5">
              <OrganizationContactCard
                formData={formData}
                onChange={handleChange}
              />
            </div>
            <div className="border-t border-cf-border/50 pt-5">
              <OrganizationAddressCard
                address={formData.address}
                onChange={handleAddressChange}
              />
            </div>
            <div className="border-t border-cf-border/50 pt-5">
              <OrganizationNotesCard
                formData={formData}
                onChange={handleChange}
              />
            </div>
          </div>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
