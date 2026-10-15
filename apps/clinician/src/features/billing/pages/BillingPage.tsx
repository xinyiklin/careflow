import BillingWorkspace from "../components/BillingWorkspace";
import useFacility from "../../facilities/hooks/useFacility";
import AccessDenied from "../../../shared/components/ui/AccessDenied";

export default function BillingPage() {
  const { selectedFacilityId, selectedMembership } = useFacility();

  const securityPermissions =
    selectedMembership?.effective_security_permissions || {};
  const canViewBilling = Boolean(securityPermissions["billing.view"]);
  const canManageBilling = Boolean(securityPermissions["billing.manage"]);

  if (!canViewBilling) {
    return (
      <AccessDenied message="You do not have permission to view billing." />
    );
  }

  return (
    <BillingWorkspace
      facilityId={selectedFacilityId}
      canManage={canManageBilling}
    />
  );
}
