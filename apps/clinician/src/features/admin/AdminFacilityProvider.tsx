import { createContext, useEffect, useMemo, useState } from "react";
import useFacility from "../facilities/hooks/useFacility";
import useAdminPermissions from "./hooks/shared/useAdminPermissions";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { EntityId } from "../../shared/api/types";
import type { Facility, UserMembership } from "../../shared/types/domain";

export type AdminFacilityContextValue = {
  manageableMemberships: UserMembership[];
  selectedAdminFacilityId: EntityId | null;
  setSelectedAdminFacilityId: Dispatch<SetStateAction<EntityId | null>>;
  selectedAdminMembership: UserMembership | undefined;
  adminFacility: Facility | null;
};

export const AdminFacilityContext =
  createContext<AdminFacilityContextValue | null>(null);

export function AdminFacilityProvider({ children }: { children: ReactNode }) {
  const { memberships, facility } = useFacility();
  const { isOrgAdmin, adminFacilityIds } = useAdminPermissions();
  const [selectedAdminFacilityId, setSelectedAdminFacilityId] =
    useState<EntityId | null>(null);

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

  const value = useMemo(
    () => ({
      manageableMemberships,
      selectedAdminFacilityId,
      setSelectedAdminFacilityId,
      selectedAdminMembership,
      adminFacility: selectedAdminMembership?.facility || null,
    }),
    [manageableMemberships, selectedAdminFacilityId, selectedAdminMembership]
  );

  return (
    <AdminFacilityContext.Provider value={value}>
      {children}
    </AdminFacilityContext.Provider>
  );
}
