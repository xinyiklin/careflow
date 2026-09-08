import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../features/auth/AuthProvider";
import { updateUserPreferences } from "../../features/auth/api/users";
import {
  normalizeLastFacilityForUser,
  resetWorkspaceAppearance,
  sanitizePreferences,
} from "./userPreferences";
import { UserPreferenceSaveQueue } from "./userPreferencePersistence";
import useMainNavigationPreference from "./useMainNavigationPreference";
import type { ReactNode } from "react";
import type { UserPreferences, UserProfile } from "../../shared/types/domain";
import type { SaveStamp, SaveStatus } from "./userPreferencePersistence";

export { DEFAULT_USER_PREFERENCES } from "./userPreferences";

type PreferenceUpdate =
  | Partial<UserPreferences>
  | ((current: UserPreferences) => Partial<UserPreferences>);
type UserPreferencesContextValue = {
  preferences: UserPreferences;
  isHydrated: boolean;
  updatePreferences: (next: PreferenceUpdate) => void;
  clearPersonalNotesForLogout: () => Promise<void>;
  resetPreferences: () => void;
  saveStatus: SaveStatus;
  retrySave: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarStartupMode: (mode: UserPreferences["sidebarStartupMode"]) => void;
};
const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

function initialPreferences(user: UserProfile | null) {
  const server = user?.preferences;
  let source = server;
  if (
    user &&
    (!server || typeof server !== "object" || Object.keys(server).length === 0)
  ) {
    try {
      const legacy = localStorage.getItem(
        `cf-user-preferences:${user.id || user.username || "user"}`
      );
      if (legacy) source = JSON.parse(legacy);
    } catch {
      // Invalid or inaccessible legacy storage falls back to the server defaults.
    }
  }
  return normalizeLastFacilityForUser(sanitizePreferences(source), user);
}

// Auth identity changes remount the session owner before its children see preferences.
// Profile acknowledgments keep the same key and never rehydrate over dirty edits.
export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <UserPreferencesSession
      key={user ? String(user.id ?? user.username) : "anonymous"}
    >
      {children}
    </UserPreferencesSession>
  );
}

function UserPreferencesSession({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [preferences, setPreferences] = useState(() =>
    initialPreferences(user)
  );
  const preferencesRef = useRef(preferences);
  const userRef = useRef(user);
  userRef.current = user;
  const [queue] = useState(() => new UserPreferenceSaveQueue());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() =>
    user &&
    JSON.stringify(preferences) !==
      JSON.stringify(sanitizePreferences(user.preferences))
      ? "pending"
      : "saved"
  );
  const [revision, setRevision] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggingOutRef = useRef(false);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  const cancelScheduledSave = useCallback(() => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useLayoutEffect(() => {
    queue.activate();
    return () => {
      cancelScheduledSave();
      queue.dispose();
    };
  }, [cancelScheduledSave, queue]);

  const persist = useCallback(
    async (snapshot: UserPreferences, stamp: SaveStamp) => {
      const userId = userRef.current?.id;
      const result = await queue.enqueue(stamp, async () => {
        setSaveStatus("saving");
        const data = await updateUserPreferences(snapshot);
        if (
          !data?.preferences ||
          typeof data.preferences !== "object" ||
          Array.isArray(data.preferences)
        ) {
          throw new Error("Invalid preference acknowledgment");
        }
        return sanitizePreferences(data.preferences);
      });
      if (result.kind === "obsolete" || !queue.isCurrent(stamp)) return;
      if (result.kind === "error") {
        setSaveStatus("error");
        throw new Error("Couldn't save workspace preferences.");
      }
      preferencesRef.current = result.value;
      setPreferences(result.value);
      setSaveStatus("saved");
      setUser((current) => {
        if (!current || current.id !== userId || !queue.isCurrent(stamp))
          return current;
        return { ...current, preferences: result.value };
      });
    },
    [queue, setUser]
  );

  const updatePreferences = useCallback(
    (next: PreferenceUpdate) => {
      if (
        !userRef.current ||
        loggingOutRef.current ||
        !queue.isCurrent(queue.stamp())
      )
        return;
      const current = preferencesRef.current;
      const patch = typeof next === "function" ? next(current) : next;
      const value = normalizeLastFacilityForUser(
        sanitizePreferences({ ...current, ...patch }),
        userRef.current
      );
      if (JSON.stringify(value) === JSON.stringify(current)) return;
      preferencesRef.current = value;
      const stamp = queue.edit();
      setPreferences(value);
      setSaveStatus("pending");
      setRevision(stamp.revision);
    },
    [queue]
  );

  // Membership changes may invalidate a facility choice, but do not replace other
  // current choices with the last acknowledged profile's preference snapshot.
  useEffect(() => {
    updatePreferences({});
  }, [user, updatePreferences]);

  useEffect(() => {
    if (!user || loggingOutRef.current || saveStatus !== "pending") return;
    const stamp = queue.stamp();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void persist(preferencesRef.current, stamp).catch(() => undefined);
    }, 400);
    return cancelScheduledSave;
  }, [cancelScheduledSave, persist, queue, revision, saveStatus, user]);

  const retrySave = useCallback(() => {
    if (
      !userRef.current ||
      loggingOutRef.current ||
      !queue.isCurrent(queue.stamp())
    )
      return;
    cancelScheduledSave();
    const stamp = queue.edit();
    setSaveStatus("pending");
    setRevision(stamp.revision);
    // The same debounce owns retry, avoiding duplicate queued requests.
  }, [cancelScheduledSave, queue]);

  const navigation = useMainNavigationPreference(
    preferences,
    updatePreferences
  );
  const { isSidebarCollapsed } = navigation;
  const resetPreferences = useCallback(() => {
    if (loggingOutRef.current) return;
    updatePreferences(
      resetWorkspaceAppearance(preferencesRef.current, isSidebarCollapsed)
    );
  }, [isSidebarCollapsed, updatePreferences]);

  const clearPersonalNotesForLogout = useCallback((): Promise<void> => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;
    if (!userRef.current) return Promise.resolve();
    loggingOutRef.current = true;
    cancelScheduledSave();
    const current = preferencesRef.current;
    const snapshot = current.clearPersonalNotesOnLogout
      ? { ...current, personalNotes: "" }
      : current;
    preferencesRef.current = snapshot;
    setPreferences(snapshot);
    setSaveStatus("pending");
    const stamp = queue.edit();
    const promise = persist(snapshot, stamp);
    logoutPromiseRef.current = promise;
    return promise;
  }, [cancelScheduledSave, persist, queue]);

  const value = useMemo(
    () => ({
      preferences,
      isHydrated: Boolean(user),
      updatePreferences,
      clearPersonalNotesForLogout,
      resetPreferences,
      saveStatus,
      retrySave,
      isSidebarCollapsed: navigation.isSidebarCollapsed,
      toggleSidebar: navigation.toggleSidebar,
      setSidebarStartupMode: navigation.setSidebarStartupMode,
    }),
    [
      preferences,
      user,
      updatePreferences,
      clearPersonalNotesForLogout,
      resetPreferences,
      saveStatus,
      retrySave,
      navigation.isSidebarCollapsed,
      navigation.toggleSidebar,
      navigation.setSidebarStartupMode,
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
  if (!context)
    throw new Error(
      "useUserPreferences must be used within UserPreferencesProvider"
    );
  return context;
}
