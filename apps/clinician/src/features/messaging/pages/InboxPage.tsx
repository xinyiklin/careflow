import useFacility from "../../facilities/hooks/useFacility";
import AccessDenied from "../../../shared/components/ui/AccessDenied";
import MessagingWorkspace from "../components/MessagingWorkspace";

export default function InboxPage() {
  const { selectedFacilityId, selectedMembership } = useFacility();

  const securityPermissions =
    selectedMembership?.effective_security_permissions || {};
  const canViewMessaging = Boolean(securityPermissions["messaging.view"]);
  const canRespondMessaging = Boolean(securityPermissions["messaging.respond"]);

  if (!canViewMessaging) {
    return (
      <AccessDenied message="You do not have permission to view the inbox." />
    );
  }

  return (
    <MessagingWorkspace
      facilityId={selectedFacilityId}
      canRespond={canRespondMessaging}
    />
  );
}
