import { useMemo } from "react";

import useFacility from "../../facilities/hooks/useFacility";
import useFacilityConfig from "../../facilities/hooks/useFacilityConfig";
import { useAuth } from "../../auth/AuthProvider";
import AccessDenied from "../../../shared/components/ui/AccessDenied";
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
      <AccessDenied message="You do not have permission to view refill requests." />
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
