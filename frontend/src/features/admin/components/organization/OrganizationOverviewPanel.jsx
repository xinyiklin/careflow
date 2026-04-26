import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useBootReadiness } from "../../../../app/BootReadinessContext";
import useOrganizationOverview from "../../hooks/organization/useOrganizationOverview";
import { AdminInlineNotice, AdminTableCard } from "../shared/AdminSurface";
import { Button } from "../../../../shared/components/ui";
import {
  hasText,
  OrganizationAddressCard,
  OrganizationContactCard,
  OrganizationFootprintCard,
  OrganizationIdentityCard,
  OrganizationNotesCard,
  OrganizationOverviewHeader,
} from "./OrganizationOverviewSections";

function emptyAddress() {
  return { line_1: "", line_2: "", city: "", state: "NY", zip_code: "" };
}

export default function OrganizationOverviewPanel() {
  const { organization, loading, saving, error, reload, updateOrganization } =
    useOrganizationOverview();
  const { setRouteReady } = useBootReadiness();
  const [formData, setFormData] = useState(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (loading) return;
    setRouteReady(true);
  }, [loading, setRouteReady]);

  useEffect(() => {
    if (!organization) return;
    setFormData({
      name: organization.name || "",
      slug: organization.slug || "",
      legal_name: organization.legal_name || "",
      phone_number: organization.phone_number || "",
      email: organization.email || "",
      website: organization.website || "",
      tax_id: organization.tax_id || "",
      notes: organization.notes || "",
      address: organization.address || emptyAddress(),
    });
  }, [organization]);

  const configuredFieldCount = useMemo(() => {
    if (!formData) return 0;
    return [
      formData.name,
      formData.slug,
      formData.legal_name,
      formData.tax_id,
      formData.phone_number,
      formData.email,
      formData.website,
      formData.address?.line_1,
    ].filter(hasText).length;
  }, [formData]);

  const adminCount = useMemo(() => {
    const members = Array.isArray(organization?.members)
      ? organization.members
      : [];
    return members.filter((member) => ["owner", "admin"].includes(member.role))
      .length;
  }, [organization]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: { ...(prev?.address || emptyAddress()), [name]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organization?.id || !formData) return;
    setSaveError("");
    try {
      await updateOrganization({
        id: organization.id,
        values: {
          ...formData,
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          legal_name: formData.legal_name.trim(),
          phone_number: formData.phone_number.trim(),
          email: formData.email.trim(),
          website: formData.website.trim(),
          tax_id: formData.tax_id.trim(),
          notes: formData.notes.trim(),
          address: formData.address?.line_1
            ? {
                line_1: formData.address.line_1.trim(),
                line_2: formData.address.line_2.trim(),
                city: formData.address.city.trim(),
                state: formData.address.state,
                zip_code: formData.address.zip_code.trim(),
              }
            : null,
        },
      });
    } catch {
      setSaveError("Failed to save organization details.");
    }
  };

  return (
    <div className="space-y-4">
      {error && <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>}
      {saveError && (
        <AdminInlineNotice tone="danger">{saveError}</AdminInlineNotice>
      )}

      <AdminTableCard
        savingLabel={saving ? "Saving..." : ""}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={reload}
              disabled={loading || saving}
            >
              <RefreshCw
                className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(
                  " "
                )}
              />
              Refresh
            </Button>
            <Button
              type="submit"
              form="organization-overview-form"
              variant="primary"
              size="sm"
              disabled={loading || saving || !formData}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        {loading || !formData ? (
          <div className="px-5 py-16 text-center text-sm text-cf-text-muted">
            Loading organization details...
          </div>
        ) : (
          <form
            id="organization-overview-form"
            onSubmit={handleSubmit}
            className="px-5 py-5"
          >
            <OrganizationOverviewHeader formData={formData} />

            <div className="grid gap-4 lg:grid-cols-3">
              <OrganizationIdentityCard
                formData={formData}
                onChange={handleChange}
              />
              <OrganizationFootprintCard
                activePeopleCount={organization.active_people_count || 0}
                adminCount={adminCount}
                configuredFieldCount={configuredFieldCount}
                hasAddress={hasText(formData.address?.line_1)}
              />
              <OrganizationContactCard
                formData={formData}
                onChange={handleChange}
              />
              <OrganizationNotesCard
                formData={formData}
                onChange={handleChange}
              />
              <OrganizationAddressCard
                address={formData.address}
                onChange={handleAddressChange}
              />
            </div>
          </form>
        )}
      </AdminTableCard>
    </div>
  );
}
