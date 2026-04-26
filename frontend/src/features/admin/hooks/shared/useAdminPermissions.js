import { useMemo } from "react";
import { useAuth } from "../../../auth/AuthProvider";

export default function useAdminPermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const isOrgAdmin = Boolean(user?.is_org_admin);
    const adminFacilityIds = user?.admin_facility_ids || [];
    const memberships = Array.isArray(user?.memberships)
      ? user.memberships
      : [];
    const hasPermission = (permissionKey) =>
      memberships.some((membership) =>
        Boolean(membership?.effective_security_permissions?.[permissionKey])
      );

    const canManageOrganizationPharmacies =
      isOrgAdmin || hasPermission("pharmacies.manage");
    const canAccessOrganizationAdmin = canManageOrganizationPharmacies;
    const canAccessFacilityAdmin = isOrgAdmin || adminFacilityIds.length > 0;
    const hasAnyAdminAccess =
      canAccessOrganizationAdmin || canAccessFacilityAdmin;

    return {
      isOrgAdmin,
      adminFacilityIds,
      canManageOrganizationPharmacies,
      canAccessOrganizationAdmin,
      canAccessFacilityAdmin,
      hasAnyAdminAccess,
    };
  }, [user]);
}
