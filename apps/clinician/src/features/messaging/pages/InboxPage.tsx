import { ShieldAlert } from "lucide-react";

import useFacility from "../../facilities/hooks/useFacility";
import Panel from "../../../shared/components/ui/Panel";
import MessagingWorkspace from "../components/MessagingWorkspace";

export default function InboxPage() {
  const { selectedFacilityId, selectedMembership } = useFacility();

  const securityPermissions =
    selectedMembership?.effective_security_permissions || {};
  const canViewMessaging = Boolean(securityPermissions["messaging.view"]);
  const canRespondMessaging = Boolean(securityPermissions["messaging.respond"]);

  if (!canViewMessaging) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Panel
          icon={ShieldAlert}
          title="Access Denied"
          tone="subtle"
          className="w-full max-w-md"
        >
          <div className="text-sm text-cf-text-muted">
            You do not have the required permissions to view the secure
            messaging inbox. If you believe this is an error, please contact
            your administrator.
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <MessagingWorkspace
      facilityId={selectedFacilityId}
      canRespond={canRespondMessaging}
    />
  );
}
