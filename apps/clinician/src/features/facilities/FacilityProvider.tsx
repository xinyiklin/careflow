import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useUserPreferences } from "../../app/context/UserPreferencesProvider";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { EntityId } from "../../shared/api/types";
import type { Facility, UserMembership } from "../../shared/types/domain";

export type FacilityContextValue = {
  memberships: UserMembership[];
  selectedFacilityId: EntityId | null;
  setSelectedFacilityId: Dispatch<SetStateAction<EntityId | null>>;
  selectedMembership: UserMembership | undefined;
  facility: Facility | null;
  role: UserMembership["role"] | null;
};

export const FacilityContext = createContext<FacilityContextValue | null>(null);

export function FacilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { preferences, updatePreferences, isHydrated } = useUserPreferences();

  const memberships = useMemo<UserMembership[]>(
    () => user?.memberships ?? [],
    [user]
  );
  const preferredFacilityId =
    preferences.lastFacilityId || preferences.defaultFacilityId || null;
  const fallbackFacilityId = user?.current_membership?.facility?.id || null;
  const initialFacilityId = preferredFacilityId || fallbackFacilityId;

  const [selectedFacilityId, setSelectedFacilityId] = useState<EntityId | null>(
    () => {
      if (!user || !user.memberships?.length) return null;
      const preferredId =
        preferences.lastFacilityId || preferences.defaultFacilityId || null;
      const fallbackId = user.current_membership?.facility?.id || null;
      const initId = preferredId || fallbackId;
      const validIds = user.memberships.map((membership) =>
        String(membership.facility.id)
      );
      if (initId && validIds.includes(String(initId))) {
        return initId;
      }
      return user.memberships[0]?.facility?.id || null;
    }
  );
  const lastInitialFacilityIdRef = useRef<string | null>(null);

  const validFacilityIds = useMemo(() => {
    return memberships.map((membership) => String(membership.facility.id));
  }, [memberships]);

  useEffect(() => {
    if (!user || !memberships.length) {
      setSelectedFacilityId(null);
      lastInitialFacilityIdRef.current = null;
      return;
    }

    const currentId = selectedFacilityId ? String(selectedFacilityId) : null;
    const hasValidSelectedFacility =
      currentId && validFacilityIds.includes(currentId);
    const normalizedInitialFacilityId =
      initialFacilityId && validFacilityIds.includes(String(initialFacilityId))
        ? String(initialFacilityId)
        : null;
    const previousInitialFacilityId = lastInitialFacilityIdRef.current;

    if (previousInitialFacilityId !== normalizedInitialFacilityId) {
      lastInitialFacilityIdRef.current = normalizedInitialFacilityId;
      if (
        normalizedInitialFacilityId &&
        (!hasValidSelectedFacility || currentId === previousInitialFacilityId)
      ) {
        setSelectedFacilityId(normalizedInitialFacilityId);
        return;
      }
    }

    if (hasValidSelectedFacility) {
      return;
    }

    if (normalizedInitialFacilityId) {
      setSelectedFacilityId(normalizedInitialFacilityId);
      return;
    }

    setSelectedFacilityId(validFacilityIds[0] || null);
  }, [
    user,
    memberships,
    selectedFacilityId,
    initialFacilityId,
    validFacilityIds,
  ]);

  useEffect(() => {
    const normalizedSelectedFacilityId = selectedFacilityId
      ? String(selectedFacilityId)
      : "";
    if (
      !isHydrated ||
      !normalizedSelectedFacilityId ||
      !validFacilityIds.includes(normalizedSelectedFacilityId) ||
      preferences.lastFacilityId === normalizedSelectedFacilityId
    ) {
      return;
    }

    updatePreferences({ lastFacilityId: normalizedSelectedFacilityId });
  }, [
    isHydrated,
    preferences.lastFacilityId,
    selectedFacilityId,
    updatePreferences,
    validFacilityIds,
  ]);

  const selectedMembership = useMemo(() => {
    return memberships.find(
      (membership) =>
        String(membership.facility.id) === String(selectedFacilityId)
    );
  }, [memberships, selectedFacilityId]);

  const value = useMemo(
    () => ({
      memberships,
      selectedFacilityId,
      setSelectedFacilityId,
      selectedMembership,
      facility: selectedMembership?.facility || null,
      role: selectedMembership?.role || null,
    }),
    [memberships, selectedFacilityId, selectedMembership]
  );

  return (
    <FacilityContext.Provider value={value}>
      {children}
    </FacilityContext.Provider>
  );
}
