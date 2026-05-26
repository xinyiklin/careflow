import { useMemo } from "react";
import { useAuth } from "../../../auth/AuthProvider";

import type { EntityId } from "../../../../shared/api/types";

export type AdminPermissions = {
  isOrgAdmin: boolean;
  adminFacilityIds: EntityId[];
  canManageOrganizationPharmacies: boolean;
  canAccessOrganizationAdmin: boolean;
  canAccessFacilityAdmin: boolean;
  hasAnyAdminAccess: boolean;
};

export default function useAdminPermissions() {
  const { user } = useAuth();

  return useMemo<AdminPermissions>(() => {
    const isOrgAdmin = Boolean(user?.is_org_admin);
    const adminFacilityIds = user?.admin_facility_ids || [];
    const memberships = Array.isArray(user?.memberships)
      ? user.memberships
      : [];
    const hasPermission = (permissionKey: string) =>
      memberships.some((membership) =>
        Boolean(membership?.effective_security_permissions?.[permissionKey])
      );

    const canManageOrganizationPharmacies =
      isOrgAdmin || hasPermission("pharmacies.organization.manage");
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
