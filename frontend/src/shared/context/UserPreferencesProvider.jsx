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
} from "../constants/quickActions";
import {
  DEFAULT_APPOINTMENT_BLOCK_DISPLAY,
  sanitizeAppointmentBlockDisplay,
} from "../constants/appointmentBlockDisplay";

const UserPreferencesContext = createContext(null);

export const DEFAULT_USER_PREFERENCES = {
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
};

function sanitizeScheduleViewMode(value) {
  return value === "agenda"
    ? "agenda"
    : DEFAULT_USER_PREFERENCES.scheduleViewMode;
}

function sanitizeScheduleStartMode(value) {
  return value === "days" ? "days" : DEFAULT_USER_PREFERENCES.scheduleStartMode;
}

function sanitizeLandingPage(value) {
  return value === "admin"
    ? "admin"
    : DEFAULT_USER_PREFERENCES.defaultLandingPage;
}

function sanitizeFacilityId(value) {
  if (value == null || value === "")
    return DEFAULT_USER_PREFERENCES.lastFacilityId;
  return String(value);
}

function normalizeLastFacilityForUser(preferences, user) {
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

function sanitizeTheme(value) {
  if (value === "dark" || value === "light") return value;
  return DEFAULT_USER_PREFERENCES.theme;
}

function sanitizePreferences(value) {
  const nextPreferences =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
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
  };
}

function getLegacyStorageKey(user) {
  if (!user) return null;
  return `cf-user-preferences:${user.id || user.username || "user"}`;
}

function loadLegacyPreferences(user) {
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

export function UserPreferencesProvider({ children }) {
  const { user, setUser } = useAuth();
  const userId = user?.id;
  const userPreferences = user?.preferences;
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasHydratedRef = useRef(false);
  const lastSavedPreferencesRef = useRef("");
  const saveRequestIdRef = useRef(0);

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
      try {
        const data = await updateUserPreferences(preferences);
        if (saveRequestIdRef.current !== requestId) return;

        const savedPreferences = sanitizePreferences(data?.preferences);
        lastSavedPreferencesRef.current = JSON.stringify(savedPreferences);
        setUser((currentUser) => {
          if (!currentUser || currentUser.id !== user.id) return currentUser;
          return {
            ...currentUser,
            preferences: savedPreferences,
          };
        });
      } catch (error) {
        console.error("Failed to save user preferences.", error);
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [preferences, setUser, user]);

  const updatePreferences = useCallback(
    (nextValue) => {
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
      resetPreferences,
    }),
    [isHydrated, preferences, resetPreferences, updatePreferences]
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
