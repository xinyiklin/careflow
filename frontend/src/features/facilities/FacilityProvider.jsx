import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useUserPreferences } from "../../shared/context/UserPreferencesProvider";

export const FacilityContext = createContext(null);

export function FacilityProvider({ children }) {
  const { user } = useAuth();
  const { preferences, updatePreferences, isHydrated } = useUserPreferences();

  const memberships = useMemo(() => user?.memberships ?? [], [user]);
  const preferredFacilityId =
    preferences.lastFacilityId || preferences.defaultFacilityId || null;
  const fallbackFacilityId = user?.current_membership?.facility?.id || null;
  const initialFacilityId = preferredFacilityId || fallbackFacilityId;

  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const lastInitialFacilityIdRef = useRef(null);

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
