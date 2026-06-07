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
  buildQuickActionAssignmentsFromLegacy,
  DEFAULT_QUICK_ACTION_ASSIGNMENTS,
  sanitizeQuickActionAssignments,
} from "../../shared/constants/quickActions";
import {
  DEFAULT_APPOINTMENT_BLOCK_DISPLAY,
  sanitizeAppointmentBlockDisplay,
} from "../../shared/constants/appointmentBlockDisplay";

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

type RawPreferences = Partial<UserPreferences> & {
  customQuickActionShortcuts?: unknown;
  [key: string]: unknown;
};

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultLandingPage: "schedule",
  lastFacilityId: "",
  sidebarCollapsed: false,
  overviewDensity: "balanced",
  scheduleStartMode: "resources",
  scheduleViewMode: "slot",
  showScheduleSlotDividers: true,
  appointmentBlockDisplay: DEFAULT_APPOINTMENT_BLOCK_DISPLAY,
  theme: "light",
  clearRecentPatientsOnLogout: true,
  recentPatients: [],
  clearPersonalNotesOnLogout: false,
  personalNotes: "",
  showDemoBadge: true,
  quickActionAssignments: DEFAULT_QUICK_ACTION_ASSIGNMENTS,
  showScheduleHeatmap: true,
  scheduleHeatmapMode: "auto",
  scheduleHeatmapDailyTarget: 20,
};

function isRawPreferences(value: unknown): value is RawPreferences {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeScheduleViewMode(value: unknown) {
  return value === "agenda"
    ? "agenda"
    : DEFAULT_USER_PREFERENCES.scheduleViewMode;
}

function sanitizeScheduleStartMode(value: unknown) {
  return value === "days" ? "days" : DEFAULT_USER_PREFERENCES.scheduleStartMode;
}

function sanitizeLandingPage(value: unknown) {
  return value === "admin"
    ? "admin"
    : DEFAULT_USER_PREFERENCES.defaultLandingPage;
}

function sanitizeFacilityId(value: unknown) {
  if (value == null || value === "")
    return DEFAULT_USER_PREFERENCES.lastFacilityId;
  return String(value);
}

function normalizeLastFacilityForUser(
  preferences: UserPreferences,
  user: UserProfile | null
): UserPreferences {
  const memberships = Array.isArray(user?.memberships) ? user.memberships : [];
  const facilityIds = memberships
    .map((membership) => membership?.facility?.id)
    .filter((facilityId) => facilityId != null)
    .map(String);

  if (!facilityIds.length) {
    const { defaultFacilityId: _legacyDefaultFacilityId, ...rest } =
      preferences;
    return {
      ...rest,
      lastFacilityId: DEFAULT_USER_PREFERENCES.lastFacilityId,
    };
  }

  const currentFacilityId = preferences.lastFacilityId
    ? String(preferences.lastFacilityId)
    : preferences.defaultFacilityId
      ? String(preferences.defaultFacilityId)
      : "";
  const { defaultFacilityId: _legacyDefaultFacilityId, ...rest } = preferences;

  return {
    ...rest,
    lastFacilityId: facilityIds.includes(currentFacilityId)
      ? currentFacilityId
      : facilityIds[0],
  };
}

function sanitizeTheme(value: unknown) {
  if (value === "dark" || value === "light") return value;
  return DEFAULT_USER_PREFERENCES.theme;
}

function sanitizePreferences(value: unknown): UserPreferences {
  const nextPreferences = isRawPreferences(value) ? value : {};
  const nextQuickActionAssignments = Array.isArray(
    nextPreferences.quickActionAssignments
  )
    ? sanitizeQuickActionAssignments(nextPreferences.quickActionAssignments)
    : buildQuickActionAssignmentsFromLegacy(
        nextPreferences.customQuickActionShortcuts
      );

  return {
    ...DEFAULT_USER_PREFERENCES,
    defaultLandingPage: sanitizeLandingPage(nextPreferences.defaultLandingPage),
    lastFacilityId: sanitizeFacilityId(
      nextPreferences.lastFacilityId || nextPreferences.defaultFacilityId
    ),
    sidebarCollapsed: Boolean(nextPreferences.sidebarCollapsed),
    overviewDensity:
      nextPreferences.overviewDensity ||
      DEFAULT_USER_PREFERENCES.overviewDensity,
    scheduleStartMode: sanitizeScheduleStartMode(
      nextPreferences.scheduleStartMode
    ),
    scheduleViewMode: sanitizeScheduleViewMode(
      nextPreferences.scheduleViewMode
    ),
    showScheduleSlotDividers:
      typeof nextPreferences.showScheduleSlotDividers === "boolean"
        ? nextPreferences.showScheduleSlotDividers
        : DEFAULT_USER_PREFERENCES.showScheduleSlotDividers,
    appointmentBlockDisplay: sanitizeAppointmentBlockDisplay(
      nextPreferences.appointmentBlockDisplay
    ),
    theme: sanitizeTheme(nextPreferences.theme),
    clearRecentPatientsOnLogout:
      typeof nextPreferences.clearRecentPatientsOnLogout === "boolean"
        ? nextPreferences.clearRecentPatientsOnLogout
        : DEFAULT_USER_PREFERENCES.clearRecentPatientsOnLogout,
    recentPatients: Array.isArray(nextPreferences.recentPatients)
      ? nextPreferences.recentPatients.slice(0, 10)
      : DEFAULT_USER_PREFERENCES.recentPatients,
    clearPersonalNotesOnLogout:
      typeof nextPreferences.clearPersonalNotesOnLogout === "boolean"
        ? nextPreferences.clearPersonalNotesOnLogout
        : DEFAULT_USER_PREFERENCES.clearPersonalNotesOnLogout,
    personalNotes:
      typeof nextPreferences.personalNotes === "string"
        ? nextPreferences.personalNotes
        : DEFAULT_USER_PREFERENCES.personalNotes,
    showDemoBadge:
      typeof nextPreferences.showDemoBadge === "boolean"
        ? nextPreferences.showDemoBadge
        : DEFAULT_USER_PREFERENCES.showDemoBadge,
    quickActionAssignments: nextQuickActionAssignments.length
      ? nextQuickActionAssignments
      : DEFAULT_USER_PREFERENCES.quickActionAssignments,
    showScheduleHeatmap:
      typeof nextPreferences.showScheduleHeatmap === "boolean"
        ? nextPreferences.showScheduleHeatmap
        : DEFAULT_USER_PREFERENCES.showScheduleHeatmap,
    scheduleHeatmapMode:
      nextPreferences.scheduleHeatmapMode === "target"
        ? "target"
        : DEFAULT_USER_PREFERENCES.scheduleHeatmapMode,
    scheduleHeatmapDailyTarget:
      typeof nextPreferences.scheduleHeatmapDailyTarget === "number" &&
      nextPreferences.scheduleHeatmapDailyTarget > 0
        ? Math.round(nextPreferences.scheduleHeatmapDailyTarget)
        : DEFAULT_USER_PREFERENCES.scheduleHeatmapDailyTarget,
  };
}

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

  const persistPreferences = useCallback(
    async (
      preferencesToSave: UserPreferences,
      requestId: number,
      userIdForSave: UserProfile["id"]
    ) => {
      const runSave = async () => {
        const data = await updateUserPreferences(preferencesToSave);
        if (saveRequestIdRef.current !== requestId) return;

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
        await persistPreferences(preferences, requestId, user.id);
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

    await persistPreferences(nextPreferences, requestId, user.id);
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
