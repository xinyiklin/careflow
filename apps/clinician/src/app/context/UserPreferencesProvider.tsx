import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../features/auth/AuthProvider";
import { updateUserPreferences } from "../../features/auth/api/users";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeLastFacilityForUser,
  sanitizePreferences,
} from "./userPreferences";
export { DEFAULT_USER_PREFERENCES } from "./userPreferences";

import type { ReactNode } from "react";
import type { UserPreferences, UserProfile } from "../../shared/types/domain";

type UserPreferencesContextValue = {
  preferences: UserPreferences;
  isHydrated: boolean;
  updatePreferences: (
    nextValue:
      | Partial<UserPreferences>
      | ((current: UserPreferences) => Partial<UserPreferences>)
  ) => void;
  clearPersonalNotesForLogout: () => Promise<void>;
  resetPreferences: () => void;
};

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

function getLegacyStorageKey(user: UserProfile | null) {
  if (!user) return null;
  return `cf-user-preferences:${user.id || user.username || "user"}`;
}

function loadLegacyPreferences(user: UserProfile | null) {
  const storageKey = getLegacyStorageKey(user);
  if (!storageKey) return null;

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return sanitizePreferences(JSON.parse(stored));
  } catch (error) {
    console.error("Failed to load legacy user preferences.", error);
    return null;
  }
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const userId = user?.id;
  const userPreferences = user?.preferences;
  const [preferences, setPreferences] = useState(() => {
    if (!user) {
      return DEFAULT_USER_PREFERENCES;
    }
    const serverPreferences = sanitizePreferences(userPreferences);
    const hasServerPreferences =
      userPreferences &&
      typeof userPreferences === "object" &&
      !Array.isArray(userPreferences) &&
      Object.keys(userPreferences).length > 0;
    const legacyPreferences = hasServerPreferences
      ? null
      : loadLegacyPreferences(user);
    return normalizeLastFacilityForUser(
      legacyPreferences || serverPreferences,
      user
    );
  });
  const [isHydrated, setIsHydrated] = useState(() => !!userId);
  const hasHydratedRef = useRef(!!userId);
  const lastSavedPreferencesRef = useRef(
    userPreferences && typeof userPreferences === "object"
      ? JSON.stringify(sanitizePreferences(userPreferences))
      : ""
  );
  const saveRequestIdRef = useRef(0);
  const pendingSaveTimeoutRef = useRef<number | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeUserIdRef = useRef(userId);
  const sessionGenerationRef = useRef(0);

  if (activeUserIdRef.current !== userId) {
    activeUserIdRef.current = userId;
    sessionGenerationRef.current += 1;
    saveRequestIdRef.current += 1;
  }

  const persistPreferences = useCallback(
    async (
      preferencesToSave: UserPreferences,
      requestId: number,
      userIdForSave: UserProfile["id"],
      sessionGeneration: number
    ) => {
      const runSave = async () => {
        if (
          activeUserIdRef.current !== userIdForSave ||
          sessionGenerationRef.current !== sessionGeneration
        ) {
          return;
        }

        const data = await updateUserPreferences(preferencesToSave);
        if (
          saveRequestIdRef.current !== requestId ||
          activeUserIdRef.current !== userIdForSave ||
          sessionGenerationRef.current !== sessionGeneration
        ) {
          return;
        }

        const savedPreferences = sanitizePreferences(data?.preferences);
        lastSavedPreferencesRef.current = JSON.stringify(savedPreferences);
        setUser((currentUser) => {
          if (!currentUser || currentUser.id !== userIdForSave) {
            return currentUser;
          }
          return {
            ...currentUser,
            preferences: savedPreferences,
          };
        });
      };

      const savePromise = saveQueueRef.current
        .catch(() => undefined)
        .then(runSave);
      saveQueueRef.current = savePromise.then(
        () => undefined,
        () => undefined
      );

      return savePromise;
    },
    [setUser]
  );

  useEffect(() => {
    if (!userId) {
      hasHydratedRef.current = false;
      lastSavedPreferencesRef.current = "";
      setPreferences(DEFAULT_USER_PREFERENCES);
      setIsHydrated(false);
      return;
    }

    const serverPreferences = sanitizePreferences(userPreferences);
    const hasServerPreferences =
      userPreferences &&
      typeof userPreferences === "object" &&
      !Array.isArray(userPreferences) &&
      Object.keys(userPreferences).length > 0;
    const legacyPreferences = hasServerPreferences
      ? null
      : loadLegacyPreferences(user);
    const nextPreferences = normalizeLastFacilityForUser(
      legacyPreferences || serverPreferences,
      user
    );

    setPreferences(nextPreferences);
    lastSavedPreferencesRef.current = JSON.stringify(serverPreferences);
    hasHydratedRef.current = true;
    setIsHydrated(true);
  }, [user, userId, userPreferences]);

  useEffect(() => {
    if (!user || !hasHydratedRef.current) return;

    const serializedPreferences = JSON.stringify(preferences);
    if (serializedPreferences === lastSavedPreferencesRef.current) {
      return;
    }

    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;

    const timeoutId = window.setTimeout(async () => {
      if (pendingSaveTimeoutRef.current === timeoutId) {
        pendingSaveTimeoutRef.current = null;
      }
      try {
        await persistPreferences(
          preferences,
          requestId,
          user.id,
          sessionGenerationRef.current
        );
      } catch (error) {
        console.error("Failed to save user preferences.", error);
      }
    }, 400);
    pendingSaveTimeoutRef.current = timeoutId;

    return () => {
      if (pendingSaveTimeoutRef.current === timeoutId) {
        window.clearTimeout(timeoutId);
        pendingSaveTimeoutRef.current = null;
      }
    };
  }, [persistPreferences, preferences, user]);

  const updatePreferences = useCallback(
    (
      nextValue:
        | Partial<UserPreferences>
        | ((current: UserPreferences) => Partial<UserPreferences>)
    ) => {
      setPreferences((current) => {
        const resolved =
          typeof nextValue === "function" ? nextValue(current) : nextValue;

        return normalizeLastFacilityForUser(
          sanitizePreferences({
            ...current,
            ...resolved,
          }),
          user
        );
      });
    },
    [user]
  );

  const clearPersonalNotesForLogout = useCallback(async () => {
    if (
      !user ||
      !hasHydratedRef.current ||
      !preferences.clearPersonalNotesOnLogout
    ) {
      return;
    }

    const nextPreferences = normalizeLastFacilityForUser(
      sanitizePreferences({
        ...preferences,
        personalNotes: "",
      }),
      user
    );

    const serializedPreferences = JSON.stringify(nextPreferences);
    if (pendingSaveTimeoutRef.current !== null) {
      window.clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }

    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
    lastSavedPreferencesRef.current = serializedPreferences;
    setPreferences(nextPreferences);

    await persistPreferences(
      nextPreferences,
      requestId,
      user.id,
      sessionGenerationRef.current
    );
  }, [persistPreferences, preferences, user]);

  const resetPreferences = useCallback(() => {
    setPreferences(
      normalizeLastFacilityForUser(DEFAULT_USER_PREFERENCES, user)
    );
  }, [user]);

  const value = useMemo(
    () => ({
      preferences,
      isHydrated,
      updatePreferences,
      clearPersonalNotesForLogout,
      resetPreferences,
    }),
    [
      clearPersonalNotesForLogout,
      isHydrated,
      preferences,
      resetPreferences,
      updatePreferences,
    ]
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);

  if (!context) {
    throw new Error(
      "useUserPreferences must be used within UserPreferencesProvider"
    );
  }

  return context;
}
