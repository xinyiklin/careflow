import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

import BillingWorkspace from "../components/BillingWorkspace";
import useFacility from "../../facilities/hooks/useFacility";
import { useBootReadiness } from "../../../app/BootReadinessContext";
import Panel from "../../../shared/components/ui/Panel";

export default function BillingPage() {
  const { selectedFacilityId, selectedMembership } = useFacility();
  const { setRouteReady } = useBootReadiness();

  const securityPermissions =
    selectedMembership?.effective_security_permissions || {};
  const canViewBilling = Boolean(securityPermissions["billing.view"]);
  const canManageBilling = Boolean(securityPermissions["billing.manage"]);

  useEffect(() => {
    setRouteReady(true);
  }, [setRouteReady]);

  if (!canViewBilling) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Panel
          icon={ShieldAlert}
          title="Access Denied"
          tone="subtle"
          className="max-w-md w-full"
        >
          <div className="text-sm text-cf-text-muted">
            You do not have the required permissions to view the Billing Center.
            If you believe this is an error, please contact your administrator.
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <BillingWorkspace
      facilityId={selectedFacilityId}
      canManage={canManageBilling}
    />
  );
}
