import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";

import useFacility from "../../facilities/hooks/useFacility";
import useFacilityConfig from "../../facilities/hooks/useFacilityConfig";
import { useAuth } from "../../auth/AuthProvider";
import Panel from "../../../shared/components/ui/Panel";
import RefillInboxWorkspace from "../components/RefillInboxWorkspace";

import type { PrescriberOption } from "../components/RefillInboxWorkspace";

export default function RefillInboxPage() {
  const { selectedFacilityId, selectedMembership } = useFacility();
  const { careProviders } = useFacilityConfig();
  const { user } = useAuth();

  const securityPermissions =
    selectedMembership?.effective_security_permissions || {};
  const canViewMedications = Boolean(securityPermissions["medications.view"]);
  const canApproveRefills = Boolean(
    securityPermissions["medications.refill.approve"]
  );
  const canEprescribe = Boolean(selectedMembership?.can_eprescribe);

  const prescribers = useMemo<PrescriberOption[]>(
    () =>
      (careProviders ?? [])
        .filter((provider) => provider.is_active !== false)
        .map((provider) => ({
          id: provider.id,
          name:
            provider.display_name ||
            [provider.first_name, provider.last_name]
              .filter(Boolean)
              .join(" ") ||
            "Unnamed provider",
        })),
    [careProviders]
  );

  const currentUserName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "Me";

  if (!canViewMedications) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Panel
          icon={ShieldAlert}
          title="Access Denied"
          tone="subtle"
          className="w-full max-w-md"
        >
          <div className="text-sm text-cf-text-muted">
            You do not have the required permissions to view refill requests. If
            you believe this is an error, please contact your administrator.
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <RefillInboxWorkspace
      facilityId={selectedFacilityId}
      canManage={canApproveRefills}
      prescribers={prescribers}
      canEprescribe={canEprescribe}
      currentUserName={currentUserName}
    />
  );
}
