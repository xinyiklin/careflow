import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import useOrganizationOverview from "../../hooks/organization/useOrganizationOverview";
import useOrganizationFacilities from "../../hooks/organization/useOrganizationFacilities";
import useOrganizationPayers from "../../hooks/organization/useOrganizationPayers";
import { formatPhoneDisplay } from "../../../../shared/utils/phone";
import { AdminInlineNotice, AdminTableCard } from "../shared/AdminSurface";
import { Button } from "../../../../shared/components/ui";
import {
  OrganizationOverviewHeader,
  OrganizationReadOnlyOverview,
} from "./OrganizationOverviewSections";
import OrganizationOverviewModal from "./OrganizationOverviewModal";
import type {
  AdminOrganizationOverview,
  AdminOrganizationUser,
  AdminSavePayload,
} from "../../types";

export default function OrganizationOverviewPanel() {
  const { organization, loading, saving, error, reload, updateOrganization } =
    useOrganizationOverview();
  const { facilities, loading: loadingFacilities } =
    useOrganizationFacilities();
  const { payers, loading: loadingPayers } = useOrganizationPayers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveError, setSaveError] = useState("");

  const adminCount = useMemo(() => {
    const members = Array.isArray(organization?.members)
      ? (organization.members as AdminOrganizationUser[])
      : [];
    return members.filter((member) =>
      ["owner", "admin"].includes(String(member.role || ""))
    ).length;
  }, [organization]);

  const org = organization as AdminOrganizationOverview | null;

  const formSummary = org
    ? {
        name: org.name || "",
        slug: org.slug || "",
        legal_name: org.legal_name || "",
        phone_number: formatPhoneDisplay(org.phone_number),
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
      }
    : null;

  const handleSave = async (values: AdminSavePayload["values"]) => {
    if (!org?.id) return;
    setSaveError("");
    try {
      await updateOrganization({ id: org.id, values });
      setIsModalOpen(false);
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
              onClick={() => reload()}
              disabled={loading || saving}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              disabled={loading || saving || !org}
            >
              Edit Details
            </Button>
          </>
        }
      >
        {loading || !formSummary ? null : (
          <div className="px-6 py-6">
            <OrganizationOverviewHeader formData={formSummary} />
            <OrganizationReadOnlyOverview
              formData={formSummary}
              activePeopleCount={Number(org?.active_people_count) || 0}
              adminCount={adminCount}
              facilitiesCount={facilities.length}
              payersCount={payers.length}
              loadingFacilities={loadingFacilities}
              loadingPayers={loadingPayers}
            />
          </div>
        )}
      </AdminTableCard>

      <OrganizationOverviewModal
        isOpen={isModalOpen}
        initialValues={org ?? null}
        saving={saving}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
