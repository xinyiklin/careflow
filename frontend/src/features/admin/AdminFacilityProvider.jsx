import { createContext, useEffect, useMemo, useState } from "react";
import useFacility from "../facilities/hooks/useFacility";
import useAdminPermissions from "./hooks/shared/useAdminPermissions";

export const AdminFacilityContext = createContext(null);

export function AdminFacilityProvider({ children }) {
  const { memberships, facility } = useFacility();
  const { isOrgAdmin, adminFacilityIds } = useAdminPermissions();
  const [selectedAdminFacilityId, setSelectedAdminFacilityId] = useState(null);

  const manageableMemberships = useMemo(() => {
    if (isOrgAdmin) return memberships || [];

    return (memberships || []).filter((membership) =>
      adminFacilityIds.includes(membership.facility.id)
    );
  }, [isOrgAdmin, memberships, adminFacilityIds]);

  const validAdminFacilityIds = useMemo(() => {
    return manageableMemberships.map((membership) =>
      String(membership.facility.id)
    );
  }, [manageableMemberships]);

  useEffect(() => {
    if (validAdminFacilityIds.length === 0) {
      setSelectedAdminFacilityId(null);
      return;
    }

    if (
      selectedAdminFacilityId &&
      validAdminFacilityIds.includes(String(selectedAdminFacilityId))
    ) {
      return;
    }

    const currentFacilityId = facility?.id ? String(facility.id) : null;
    setSelectedAdminFacilityId(
      currentFacilityId && validAdminFacilityIds.includes(currentFacilityId)
        ? currentFacilityId
        : validAdminFacilityIds[0]
    );
  }, [facility?.id, selectedAdminFacilityId, validAdminFacilityIds]);

  const selectedAdminMembership = useMemo(() => {
    return manageableMemberships.find(
      (membership) =>
        String(membership.facility.id) === String(selectedAdminFacilityId)
    );
  }, [manageableMemberships, selectedAdminFacilityId]);

  const value = {
    manageableMemberships,
    selectedAdminFacilityId,
    setSelectedAdminFacilityId,
    selectedAdminMembership,
    adminFacility: selectedAdminMembership?.facility || null,
  };

  return (
    <AdminFacilityContext.Provider value={value}>
      {children}
    </AdminFacilityContext.Provider>
  );
}
