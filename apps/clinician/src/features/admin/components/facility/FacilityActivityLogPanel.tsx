import useAdminFacility from "../../hooks/shared/useAdminFacility";
import OrganizationActivityLogPanel from "../organization/OrganizationActivityLogPanel";
import { AdminInlineNotice } from "../shared/AdminSurface";

export default function FacilityActivityLogPanel() {
  const { adminFacility } = useAdminFacility();

  if (!adminFacility?.id) {
    return (
      <AdminInlineNotice>
        Select a facility to view the activity log.
      </AdminInlineNotice>
    );
  }

  return (
    <OrganizationActivityLogPanel
      facilityId={adminFacility.id}
      scope="facility"
      scopeLabel="facility"
      showFacilityFilter={false}
    />
  );
}
